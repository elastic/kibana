/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs/promises';
import moment from 'moment';
import { existsSync } from 'fs';
import path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { initClient, Document } from './es_client';

const DATE_FORMAT = `YYYY-MM-DD'T'HH:mm:ss.SSS'Z'`;
const STATIC_RESOURCES_PATTERN = /\.(css|ico|js|json|jpeg|jpg|gif|png|otf|ttf|woff|woff2)$/;

interface CLIParams {
  param: {
    journeyName: string;
    scalabilitySetup: ScalabilitySetup;
    buildId: string;
    withoutStaticResources: boolean;
  };
  client: {
    baseURL: string;
    username: string;
    password: string;
  };
  log: ToolingLog;
}

interface Stage {
  action: string;
  minUsersCount?: number;
  maxUsersCount: number;
  duration: string;
}

export interface ScalabilitySetup {
  warmup: { stages: Stage[] };
  test: { stages: Stage[] };
  maxDuration: string;
}

const parsePayload = (payload: string, traceId: string, log: ToolingLog): string | undefined => {
  let body;
  try {
    body = JSON.parse(payload);
  } catch (error) {
    log.error(`Failed to parse payload - trace_id: '${traceId}'`);
  }
  return body;
};

const calculateTransactionTimeRage = (hit: SearchHit<Document>) => {
  const trSource = hit._source as Document;
  const startTime = trSource['@timestamp'];
  const duration = trSource.transaction.duration.us / 1000; // convert microseconds to milliseconds
  const endTime = moment(startTime, DATE_FORMAT).add(duration, 'milliseconds').toISOString();
  return { startTime, endTime };
};

const getTraceItems = (
  hits: Array<SearchHit<Document>>,
  withoutStaticResources: boolean,
  log: ToolingLog
) => {
  const data = hits
    .map((hit) => hit!._source as Document)
    .map((hit) => {
      const payload = hit.http.request?.body?.original;
      return {
        processor: hit.processor,
        traceId: hit.trace.id,
        timestamp: hit['@timestamp'],
        environment: hit.environment,
        request: {
          url: { path: hit.url.path },
          headers: hit.http.request.headers,
          method: hit.http.request.method,
          body: payload ? parsePayload(payload, hit.trace.id, log) : undefined,
        },
        response: { statusCode: hit.http.response.status_code },
        transaction: {
          id: hit.transaction.id,
          name: hit.transaction.name,
          type: hit.transaction.type,
        },
      };
    });

  return withoutStaticResources
    ? data.filter((item) => !STATIC_RESOURCES_PATTERN.test(item.request.url.path))
    : data;
};

export const extractor = async ({ param, client, log }: CLIParams) => {
  const authOptions = {
    node: client.baseURL,
    username: client.username,
    password: client.password,
  };
  const { journeyName, scalabilitySetup, buildId, withoutStaticResources } = param;
  log.info(
    `Searching transactions with 'labels.testBuildId=${buildId}' and 'labels.journeyName=${journeyName}'`
  );
  const esClient = initClient(authOptions);
  const ftrTransactionHits = await esClient.getFtrTransactions(buildId, journeyName);
  if (!ftrTransactionHits || ftrTransactionHits.length === 0) {
    log.warning(
      `No transactions found. Can't calculate journey time range, output file won't be generated.`
    );
    return;
  }

  // There should be a single top-level transaction, representing journey browser starting time and session duration.
  if (ftrTransactionHits.length > 1) {
    log.warning(`Filtering doesn't work, more than 1 'functional test runner' transaction found`);
    return;
  }

  const timeRange = calculateTransactionTimeRage(ftrTransactionHits[0]);
  // Filtering out setup/teardown related transactions by time range from 'functional test runner' transaction
  const hits = await esClient.getKibanaServerTransactions(buildId, journeyName, timeRange);
  if (!hits || hits.length === 0) {
    log.warning(`No transactions found. Output file won't be generated.`);
    return;
  }

  const source = hits[0]!._source as Document;
  const kibanaVersion = source.service.version;

  const output = {
    journeyName,
    kibanaVersion,
    scalabilitySetup,
    traceItems: getTraceItems(hits, withoutStaticResources, log),
  };

  const outputDir = path.resolve('target/scalability_traces');
  const fileName = `${output.journeyName.replace(/ /g, '')}-${buildId}.json`;
  const filePath = path.resolve(outputDir, fileName);

  log.info(`Found ${output.traceItems.length} transactions, output file: ${filePath}`);
  if (!existsSync(outputDir)) {
    await fs.mkdir(outputDir, { recursive: true });
  }
  await fs.writeFile(filePath, JSON.stringify(output, null, 2), 'utf8');
};

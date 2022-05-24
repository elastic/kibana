/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { initClient, Document } from './es_client';

interface CLIParams {
  param: {
    journeyName: string;
    buildId: string;
  };
  client: {
    baseURL: string;
    username: string;
    password: string;
  };
  log: ToolingLog;
}

export const extractor = async ({ param, client, log }: CLIParams) => {
  const authOptions = {
    node: client.baseURL,
    username: client.username,
    password: client.password,
  };
  const esClient = initClient(authOptions);
  const hits = await esClient.getTransactions(param.buildId, param.journeyName);
  if (!hits || hits.length === 0) {
    log.warning(`
      No transactions found with 'labels.testBuildId=${param.buildId}' and 'labels.journeyName=${param.journeyName}'
      \nOutput file won't be generated
    `);
    return;
  }

  const source = hits[0]!._source as Document;
  const journeyName = source.labels.journeyName || 'Unknown Journey';
  const kibanaVersion = source.service.version;
  const maxUsersCount = source.labels.maxUsersCount || '0';

  const data = hits
    .map((hit) => hit!._source as Document)
    .map((hit) => {
      return {
        processor: hit.processor,
        traceId: hit.trace.id,
        timestamp: hit['@timestamp'],
        environment: hit.environment,
        request: {
          url: { path: hit.url.path },
          headers: hit.http.request.headers,
          method: hit.http.request.method,
          body: hit.http.request.body ? JSON.parse(hit.http.request.body.original) : '',
        },
        response: { statusCode: hit.http.response.status_code },
        transaction: {
          id: hit.transaction.id,
          name: hit.transaction.name,
          type: hit.transaction.type,
        },
      };
    });

  const output = {
    journeyName,
    kibanaVersion,
    maxUsersCount,
    traceItems: data,
  };

  const outputDir = path.resolve('target/scalability_traces');
  const fileName = `${output.journeyName.replace(/ /g, '')}-${param.buildId}.json`;
  const filePath = path.resolve(outputDir, fileName);

  log.info(`Found ${hits.length} transactions, output file: ${filePath}`);
  if (!existsSync(outputDir)) {
    await fs.mkdir(outputDir, { recursive: true });
  }
  await fs.writeFile(filePath, JSON.stringify(output, null, 2), 'utf8');
};

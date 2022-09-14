/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { ESClient, TransactionDoc } from './es_client';
import { getESRequests, getKibanaRequests } from './request';
import { requestsToStreams } from './stream';
import { CLIParams, Request } from './types';
import { calculateTransactionTimeRage, getSteps, saveFile } from './helpers';

const getJourneySteps = async (
  esClient: ESClient,
  log: ToolingLog,
  buildId: string,
  journeyName: string,
  splitBySteps: boolean
) => {
  if (splitBySteps) {
    log.info('Splitting request streams by journey steps');
    const ftrStepHits = await esClient.getJourneySteps(buildId, journeyName);
    if (!ftrStepHits || ftrStepHits.length === 0) {
      throw new Error(
        `No 'functional test runner' steps found. Can't calculate steps time range, output file won't be generated.`
      );
    }
    return getSteps(ftrStepHits);
  } else {
    const ftrTransactionHits = await esClient.getJourneyTransactions(buildId, journeyName);

    if (!ftrTransactionHits || ftrTransactionHits.length === 0) {
      throw new Error(
        `No 'functional test runner' transactions found. Can't calculate journey time range, output file won't be generated.`
      );
    }

    // There should be a single top-level transaction, representing journey browser starting time and session duration.
    if (ftrTransactionHits.length > 1) {
      throw new Error(
        `Filtering doesn't work, more than 1 'functional test runner' transaction found`
      );
    }

    return [{ name: 'journey', ...calculateTransactionTimeRage(ftrTransactionHits[0]) }];
  }
};

export const extractor = async ({ param, client, log }: CLIParams) => {
  const authOptions = {
    node: client.baseURL,
    username: client.username,
    password: client.password,
  };
  const { journeyName, scalabilitySetup, testData, buildId, withoutStaticResources, splitBySteps } =
    param;
  log.info(
    `Searching transactions with 'labels.testBuildId=${buildId}' and 'labels.journeyName=${journeyName}'`
  );

  const outputDir = path.resolve('target/scalability_traces');
  const fileName = `${journeyName.replace(/ /g, '')}-${buildId}.json`;

  const esClient = new ESClient(authOptions, log);
  const steps = await getJourneySteps(esClient, log, buildId, journeyName, splitBySteps);
  const stepsWithTransactions = await esClient.getKibanaServerTransactions(
    buildId,
    journeyName,
    steps
  );

  const hits = stepsWithTransactions.flatMap((step) => step.transactions);

  if (!hits || hits.length === 0) {
    log.warning(`No Kibana server transactions found. Output file won't be generated.`);
    return;
  }

  const source = hits[0]!._source as TransactionDoc;
  const kibanaVersion = source.service.version;

  const kibanaRequests = stepsWithTransactions.map((step) => ({
    name: step.name,
    startTime: step.startTime,
    endTime: step.endTime,
    requests: getKibanaRequests(step.transactions, withoutStaticResources),
  }));

  const esRequests = await Promise.all(
    kibanaRequests.map(async (step) => {
      const requests = await getESRequests(esClient, step.requests);
      return {
        name: step.name,
        startTime: step.startTime,
        endTime: step.endTime,
        requests,
      };
    })
  );

  const kibanaReqsCount = kibanaRequests.flatMap((request) => request.requests).length;
  const esReqsCount = esRequests.flatMap((request) => request.requests).length;

  log.info(`Found ${kibanaReqsCount} Kibana server and ${esReqsCount} Elasticsearch requests`);

  const esStreams = esRequests.map((step) => ({
    name: step.name,
    startTime: step.startTime,
    endTime: step.endTime,
    streams: requestsToStreams<Request>(step.requests),
  }));

  const esOutput = {
    journeyName,
    kibanaVersion,
    testData,
    ...(splitBySteps ? { steps: esStreams } : { streams: esStreams[0].streams }),
  };

  await saveFile(esOutput, path.resolve(outputDir, 'es'), fileName, log);

  if (scalabilitySetup) {
    const kibanaStreams = kibanaRequests.map((step) => ({
      name: step.name,
      startTime: step.startTime,
      endTime: step.endTime,
      streams: requestsToStreams<Request>(step.requests),
    }));

    const kibanaOutput = {
      journeyName,
      kibanaVersion,
      scalabilitySetup,
      testData,
      ...(splitBySteps ? { steps: kibanaStreams } : { streams: kibanaStreams[0].streams }),
    };
    await saveFile(kibanaOutput, path.resolve(outputDir, 'server'), fileName, log);
  }
};

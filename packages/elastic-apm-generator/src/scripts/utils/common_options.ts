/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const fileOption = {
  describe: 'File that contains the trace scenario',
  demandOption: true,
  string: true as const,
};

const intervalOption = {
  describe: 'The interval at which to index data',
  default: '10s',
};

const targetOption = {
  describe: 'Elasticsearch target, including username/password',
  demandOption: true as const,
  string: true as const,
};

const bucketSizeOption = {
  describe: 'Size of bucket for which to generate data',
  default: '15m',
};

const workerOption = {
  describe: 'Amount of Node.js worker threads',
  default: 5,
};

const cleanOption = {
  describe: 'Clean APM indices before indexing new data',
  default: false,
  boolean: true as const,
};

const logLevelOption = {
  describe: 'Log level',
  default: 'info',
};

const clientWorkerOption = {
  describe: 'Number of concurrently connected ES clients',
  default: 5,
};

const batchSizeOption = {
  describe: 'Number of documents per bulk index request',
  default: 1000,
};

export {
  fileOption,
  intervalOption,
  targetOption,
  bucketSizeOption,
  workerOption,
  cleanOption,
  logLevelOption,
  clientWorkerOption,
  batchSizeOption,
};

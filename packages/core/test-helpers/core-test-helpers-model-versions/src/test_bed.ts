/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { startElasticsearch } from './elasticsearch';
import {
  prepareModelVersionTestKit,
  type ModelVersionTestkitOptions,
  type ModelVersionTestKit,
} from './test_kit';

export interface ModelVersionTestBed {
  startES: () => Promise<void>;
  stopES: () => Promise<void>;
  clearData: () => Promise<void>;
  prepareTestKit: (options: ModelVersionTestkitOptions) => Promise<ModelVersionTestKit>;
}

export const createModelVersionTestBed = (): ModelVersionTestBed => {
  let elasticsearch: TestElasticsearchUtils | undefined;

  const startES = async () => {
    if (elasticsearch) {
      throw new Error('Elasticsearch already started');
    }
    elasticsearch = await startElasticsearch();
  };

  const stopES = async () => {
    if (!elasticsearch) {
      throw new Error('Elasticsearch not started');
    }
    await elasticsearch.stop();
    elasticsearch = undefined;
  };

  const clearData = async () => {
    if (!elasticsearch) {
      throw new Error('Elasticsearch not started');
    }
    // TODO  const client = elasticsearch!.es.getClient();
  };

  return {
    startES,
    stopES,
    clearData,
    prepareTestKit: prepareModelVersionTestKit,
  };
};

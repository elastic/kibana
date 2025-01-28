/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import { startElasticsearch } from './elasticsearch';
import { prepareModelVersionTestKit } from './test_kit';
import type { ModelVersionTestBed } from './types';

/**
 * Create a {@link ModelVersionTestBed} that can be used for model version integration testing.
 *
 * @example
 * ```ts
 * describe('myIntegrationTest', () => {
 *   const testbed = createModelVersionTestBed();
 *   let testkit: ModelVersionTestKit;
 *
 *   beforeAll(async () => {
 *     await testbed.startES();
 *   });
 *
 *   afterAll(async () => {
 *     await testbed.stopES();
 *   });
 *
 *   beforeEach(async () => {
 *     testkit = await testbed.prepareTestKit({
 *       savedObjectDefinitions: [{
 *         definition: mySoTypeDefinition,
 *         modelVersionBefore: 1,
 *         modelVersionAfter: 2,
 *       }]
 *     })
 *   });
 *
 *   afterEach(async () => {
 *     if(testkit) {
 *       await testkit.tearDown();
 *     }
 *   });
 *
 *   it('can be used to test model version cohabitation', async () => {
 *     // last registered version is `1`
 *     const repositoryV1 = testkit.repositoryBefore;
 *     // last registered version is `2`
 *     const repositoryV2 = testkit.repositoryAfter;
 *
 *     // do something with the two repositories, e.g
 *     await repositoryV1.create(someAttrs, { id });
 *     const v2docReadFromV1 = await repositoryV2.get('my-type', id);
 *     expect(v2docReadFromV1.attributes).toEqual(something);
 *   })
 * })
 * ```
 *
 * @public
 */
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
    await delay(10);
    elasticsearch = undefined;
  };

  return {
    startES,
    stopES,
    prepareTestKit: prepareModelVersionTestKit,
  };
};

const delay = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

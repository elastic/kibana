/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import {
  setupEsqlEnv,
  mappingVariants,
  type EsqlEnv,
  type EsqlValidationFixtures,
} from './helpers';

const loadFixtures = async () => {
  const json = await readFile(join(__dirname, '../esql_validation_meta_tests.json'), 'utf8');
  return JSON.parse(json) as EsqlValidationFixtures;
};

describe('ES|QL validation error integration', () => {
  let esqlEnv: EsqlEnv;
  let fixtures: EsqlValidationFixtures;

  beforeAll(async () => {
    [esqlEnv, fixtures] = await Promise.all([setupEsqlEnv(), loadFixtures()]);
  });

  afterAll(async () => {
    await esqlEnv?.cleanup();
    await esqlEnv?.integrationEnv.shutdown();
  });

  for (const mappingVariant of mappingVariants) {
    describe(`using ${mappingVariant.name}`, () => {
      beforeAll(async () => {
        await esqlEnv.setupIndicesPolicies(mappingVariant);
      });

      afterAll(async () => {
        await esqlEnv.cleanup();
      });

      it('does not report client-side validation errors for queries accepted by Elasticsearch', async () => {
        const failures: string[] = [];

        for (const { query, error } of fixtures.testCases) {
          const esqlResponse = await esqlEnv.sendEsqlQuery(query);

          if (error.length && !esqlResponse.error) {
            failures.push(`Client-side validator rejected a query accepted by ES: ${query}`);
          }
        }

        expect(failures).toEqual([]);
      });
    });
  }
});

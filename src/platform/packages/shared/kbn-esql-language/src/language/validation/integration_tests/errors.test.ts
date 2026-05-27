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
  runClientValidation,
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
  const falseNegatives = new Set<string>();

  beforeAll(async () => {
    [esqlEnv, fixtures] = await Promise.all([setupEsqlEnv(), loadFixtures()]);
    await esqlEnv.setupIndicesPolicies();
  });

  afterAll(async () => {
    if (falseNegatives.size > 0) {
      process.stdout.write(
        `\nNon-blocking client/ES validation mismatches:\n${Array.from(falseNegatives).join(
          '\n'
        )}\n`
      );
    }
    await esqlEnv?.integrationEnv.shutdown();
  });

  it('does not report client-side validation errors for queries accepted by Elasticsearch', async () => {
    const falsePositives: string[] = [];

    for (const { query } of fixtures.testCases) {
      const [{ errors }, esqlResponse] = await Promise.all([
        runClientValidation(query),
        esqlEnv.sendEsqlQuery(query),
      ]);

      const clientHasError = errors.length > 0;
      const serverHasError = Boolean(esqlResponse.error);

      if (clientHasError && !serverHasError) {
        falsePositives.push(`Client-side validator rejected a query accepted by ES: ${query}`);
      }
      if (!clientHasError && serverHasError) {
        falseNegatives.add(
          `ES rejected a query accepted by the client-side validator: ${JSON.stringify(query)}`
        );
      }
    }

    expect(falsePositives).toEqual([]);
  });
});

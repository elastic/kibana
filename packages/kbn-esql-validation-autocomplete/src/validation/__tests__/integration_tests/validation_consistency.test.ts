/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setup } from '../helpers';
import { validationFromCommandTestSuite } from '../test_suites/validation.command.from';
import { validationMetricsCommandTestSuite } from '../test_suites/validation.command.metrics';
import { validationStatsCommandTestSuite } from '../test_suites/validation.command.stats';
import { type EsqlEnv, setupEsqlEnv } from './helpers';

/*
 * This integration test suite re-runs validation tests and checks if the ES server
 * also returns an error when our client-side validation finds an error.
 */

describe('validation consistency', () => {
  let esqlEnv: EsqlEnv | undefined;

  beforeAll(async () => {
    esqlEnv = await setupEsqlEnv();
  });

  afterAll(async () => {
    await esqlEnv?.integrationEnv?.shutdown();
  });

  const stringVariants = ['text', 'keyword'] as const;
  const numberVariants = ['integer', 'long', 'double', 'long'] as const;

  for (const stringFieldType of stringVariants) {
    for (const numberFieldType of numberVariants) {
      describe(`string variant = ${stringFieldType}, number variant = ${numberFieldType}`, () => {
        beforeAll(async () => {
          await esqlEnv?.setupIndicesPolicies(stringFieldType, numberFieldType);
        });

        afterAll(async () => {
          await esqlEnv?.cleanup();
        });

        /**
         * Sets up the unit test dependency for the test suites.
         */
        const unitTestSetup = async () => {
          const kit = await setup();
          return {
            ...kit,
            expectErrors: async (query: string, errors: string[], warnings: string[] = []) => {
              const jsonBody = await esqlEnv!.sendEsqlQuery(query);
              const clientSideHasError = Boolean(errors.length);
              const serverSideHasError = Boolean(jsonBody.error);

              if (clientSideHasError && !serverSideHasError) {
                throw new Error(`Client side errored but ES server did not: ${query}`);
              } else if (serverSideHasError && !clientSideHasError) {
                /**
                 * In this case client side validator can improve, but it's not
                 * hard failure rather log it as it can be a useful to
                 * investigate a bug on the ES implementation side for some type
                 * combination.
                 */
                // eslint-disable-next-line no-console
                console.warn(
                  'Server error, but no client-side error',
                  query,
                  jsonBody.error!.message
                );
              }
            },
          };
        };

        validationFromCommandTestSuite(unitTestSetup);
        validationMetricsCommandTestSuite(unitTestSetup);
        validationStatsCommandTestSuite(unitTestSetup);
      });
    }
  }
});

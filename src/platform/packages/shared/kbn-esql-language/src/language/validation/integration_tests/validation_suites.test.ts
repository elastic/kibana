/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import pMap from 'p-map';
import { BasicPrettyPrinter, synth } from '@elastic/esql';
import type { ESQLCommand } from '@elastic/esql/types';
import type { ESQLFieldWithMetadata, EsqlFieldType } from '@kbn/esql-types';
import type { ESQLMessage } from '../../../commands';
import { columnsAfter } from '../../../commands/registry/from/columns_after';
import { createValidationTestSetup, type Setup } from '../__tests__/helpers';
import { runColumnExistenceValidationSuite } from '../__tests__/column_existence_suite';
import { runCommandsValidationSuite } from '../__tests__/commands_suite';
import { runFieldsAndVariablesValidationSuite } from '../__tests__/fields_and_variables_suite';
import { runFunctionsValidationSuite } from '../__tests__/functions_suite';
import { runInlineCastValidationSuite } from '../__tests__/inline_cast_suite';
import { runSourcesValidationSuite } from '../__tests__/sources_suite';
import { runSubqueriesValidationSuite } from '../__tests__/subqueries_suite';
import { runValidationCommandsLicenseSuite } from '../__tests__/commands_license_suite';
import { runValidationParamsSuite } from '../__tests__/params_suite';
import { setupEsqlEnv, type EsqlEnv } from './helpers';

const ES_QUERY_CONCURRENCY = 8;

describe('ES|QL validation integration suites', () => {
  let esqlEnv: EsqlEnv | undefined;
  const clientRejectedQueries = new Map<string, string[]>();

  const setup: Setup = createValidationTestSetup({
    afterValidate: async ({ query, result, hasUnmodifiedDefaultCallbacks }) => {
      // Integration tests compare with real ES, while validateQuery still uses unit-test mocks.
      // This flag lets us skip ES checks when a unit test overrides those mocks.
      if (!hasUnmodifiedDefaultCallbacks) {
        return;
      }

      if (!esqlEnv) {
        throw new Error('ES|QL integration environment has not been initialized.');
      }

      const clientHasError = result.errors.length > 0;
      if (!clientHasError) {
        return;
      }

      // Ignore syntax (parser) errors; only semantic client errors can be false positives vs ES.
      const semanticErrors = result.errors.filter((error): error is ESQLMessage => 'text' in error);
      if (semanticErrors.length === 0) {
        return;
      }

      const errorTexts = semanticErrors.map((error) => error.text);
      clientRejectedQueries.set(query, [
        ...new Set([...(clientRejectedQueries.get(query) ?? []), ...errorTexts]),
      ]);
    },
  });

  beforeAll(async () => {
    esqlEnv = await setupEsqlEnv();
    await esqlEnv.setupIndicesPolicies();
  });

  afterAll(async () => {
    try {
      await esqlEnv?.cleanup();
    } finally {
      await esqlEnv?.integrationEnv.stop();
    }
  });

  runColumnExistenceValidationSuite(setup);
  runCommandsValidationSuite(setup);
  runFieldsAndVariablesValidationSuite(setup);
  runSourcesValidationSuite(setup);
  runFunctionsValidationSuite(setup);
  runInlineCastValidationSuite(setup);
  runSubqueriesValidationSuite(setup);
  runValidationCommandsLicenseSuite(setup);
  runValidationParamsSuite(setup);

  it('uses Elasticsearch multi-source semantics for conflicting fields', async () => {
    if (!esqlEnv) {
      throw new Error('ES|QL integration environment has not been initialized.');
    }

    const { esClient } = esqlEnv.integrationEnv;
    const keywordIndex = 'esql-language-conflict-keyword';
    const longIndex = 'esql-language-conflict-long';
    const command = synth.cmd`FROM ${keywordIndex}, ${longIndex}`;

    await esClient.indices.create({
      index: keywordIndex,
      mappings: {
        properties: {
          shared_field: { type: 'keyword' },
          only_keyword: { type: 'keyword' },
        },
      },
    });
    await esClient.indices.create({
      index: longIndex,
      mappings: {
        properties: {
          shared_field: { type: 'long' },
          only_long: { type: 'long' },
        },
      },
    });

    try {
      const expectedResponse = await esClient.esql.query({
        query: `${BasicPrettyPrinter.command(command)} | LIMIT 0`,
      });
      const fromFrom = jest.fn(
        async (fromCommand: ESQLCommand): Promise<ESQLFieldWithMetadata[]> => {
          const response = await esClient.esql.query({
            query: `${BasicPrettyPrinter.command(fromCommand)} | LIMIT 0`,
          });

          return response.columns.map(({ name, type }) => ({
            name,
            type: type as EsqlFieldType,
            userDefined: false,
          }));
        }
      );

      const columns = await columnsAfter(command, [], '', {
        fromFrom,
        fromJoin: async () => [],
        fromEnrich: async () => [],
      });

      expect(fromFrom).toHaveBeenCalledTimes(1);
      expect(columns).toEqual(
        expectedResponse.columns.map(({ name, type }) => ({
          name,
          type,
          userDefined: false,
        }))
      );
      expect(columns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'only_keyword', type: 'keyword' }),
          expect.objectContaining({ name: 'only_long', type: 'long' }),
          expect.objectContaining({ name: 'shared_field', type: 'unsupported' }),
        ])
      );
    } finally {
      await esClient.indices.delete({
        index: [keywordIndex, longIndex],
        ignore_unavailable: true,
      });
    }
  });

  it('when Elasticsearch accepts a query, the client validator does not report errors', async () => {
    if (!esqlEnv) {
      throw new Error('ES|QL integration environment has not been initialized.');
    }
    const env = esqlEnv;

    const clientErrorsWhenEsAccepts = await pMap(
      Array.from(clientRejectedQueries.entries()),
      async ([query, errors]) => {
        const esqlResponse = await env.sendEsqlQuery(query);

        if (esqlResponse.error) {
          return undefined;
        }

        return `Elasticsearch accepted the query but client validation reported errors: ${JSON.stringify(
          query
        )}; errors: ${JSON.stringify(errors)}`;
      },
      { concurrency: ES_QUERY_CONCURRENCY }
    );

    expect(clientErrorsWhenEsAccepts.filter(Boolean)).toEqual([]);
  });
});

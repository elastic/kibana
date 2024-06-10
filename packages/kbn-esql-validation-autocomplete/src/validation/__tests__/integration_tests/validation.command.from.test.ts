/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRootWithCorePlugins, createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { indexes, policies, unsupported_field, fields } from '../../../__tests__/helpers';
import { setup } from '../helpers';
import { runTestSuite as runFromCommandTestSuite } from '../test_suites/validation.command.from';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';

// TODO: revisit this
const enrichFieldsRaw = [
  {
    name: 'otherField',
    type: 'string',
  },
  {
    name: 'yetAnotherField',
    type: 'number',
  },
  {
    name: 'otherStringField',
    type: 'keyword',
  },
];

export type IntegrationEnvKit = Awaited<ReturnType<typeof setupIntegrationEnv>>;

const setupIntegrationEnv = async () => {
  const servers = await createTestServers({
    adjustTimeout: jest.setTimeout,
    settings: {
      es: {
        license: 'basic',
      },
    },
  });
  const es = await servers.startES();
  const root = await createRootWithCorePlugins();

  await root.preboot();
  await root.setup();

  const coreStart = await root.start();
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const shutdown = async () => {
    await root.shutdown();
    await es.stop();
  };

  return {
    servers,
    es,
    root,
    coreStart,
    esClient,
    shutdown,
  };
};

describe('validation', () => {
  let integrationEnv: IntegrationEnvKit | undefined;

  beforeAll(async () => {
    integrationEnv = await setupIntegrationEnv();
  });

  afterAll(async () => {
    await integrationEnv?.shutdown();
  });

  describe('commands', () => {
    test('test...', async () => {
      // test...
      expect(1).toBe(1);
    });
  });

  // const stringVariants = ['text', 'keyword'] as const;
  // const numberVariants = ['integer', 'long', 'double', 'long'] as const;
  const stringVariants = ['text'] as const;
  const numberVariants = ['integer'] as const;

  const cleanup = async () => {
    const { esClient } = integrationEnv!;
    await esClient.indices.delete({ index: indexes, ignore_unavailable: true }, { ignore: [404] });
    await esClient.indices.delete(
      { index: policies[0].sourceIndices[0], ignore_unavailable: true },
      { ignore: [404] }
    );
    for (const policy of policies) {
      await esClient.enrich.deletePolicy({ name: policy.name }, { ignore: [404] });
    }
  };

  function createIndexRequest(
    index: string,
    fieldList: Array<{ name: string; type: string }>,
    stringType: 'text' | 'keyword',
    numberType: 'integer' | 'double' | 'long' | 'unsigned_long'
  ) {
    return {
      index,
      mappings: {
        properties: fieldList.reduce(
          (
            memo: Record<string, MappingProperty>,
            { name, type }: { name: string; type: string }
          ) => {
            let esType = type;
            if (type === 'string') {
              esType = stringType;
            }
            if (type === 'number') {
              esType = numberType;
            }
            if (type === 'cartesian_point') {
              esType = 'point';
            }
            if (type === 'cartesian_shape') {
              esType = 'shape';
            }
            if (type === 'unsupported') {
              esType = 'integer_range';
            }
            memo[name] = { type: esType } as MappingProperty;
            return memo;
          },
          {}
        ),
      },
    };
  }

  for (const stringFieldType of stringVariants) {
    for (const numberFieldType of numberVariants) {
      describe(`Using string field type: ${stringFieldType} and number field type: ${numberFieldType}`, () => {
        beforeAll(async () => {
          const { esClient: es } = integrationEnv!;
          await cleanup();
          for (const index of indexes) {
            await es.indices.create(
              createIndexRequest(
                index,
                /unsupported/.test(index) ? unsupported_field : fields,
                stringFieldType,
                numberFieldType
              ),
              { ignore: [409] }
            );
          }

          for (const { sourceIndices, matchField } of policies.slice(0, 1)) {
            const enrichFields = [{ name: matchField, type: 'string' }].concat(enrichFieldsRaw);
            await es.indices.create(
              createIndexRequest(sourceIndices[0], enrichFields, stringFieldType, numberFieldType),
              {
                ignore: [409],
              }
            );
          }
          for (const { name, sourceIndices, matchField, enrichFields } of policies) {
            await es.enrich.putPolicy(
              {
                name,
                body: {
                  match: {
                    indices: sourceIndices,
                    match_field: matchField,
                    enrich_fields: enrichFields,
                  },
                },
              },
              { ignore: [409] }
            );
            await es.enrich.executePolicy({ name });
          }
        });

        interface EsqlResultColumn {
          name: string;
          type: string;
        }

        type EsqlResultRow = Array<string | null>;

        interface EsqlTable {
          columns: EsqlResultColumn[];
          values: EsqlResultRow[];
        }

        async function sendESQLQuery(query: string): Promise<{
          resp: EsqlTable | undefined;
          error: { message: string } | undefined;
        }> {
          try {
            const resp = await integrationEnv!.esClient.transport.request<EsqlTable>({
              method: 'POST',
              path: '/_query',
              body: {
                query,
              },
            });
            return { resp, error: undefined };
          } catch (e) {
            return { resp: undefined, error: { message: e.meta.body.error.root_cause[0].reason } };
          }
        }

        afterAll(async () => {
          await cleanup();
        });

        runFromCommandTestSuite(async () => {
          const kit = await setup();
          return {
            ...kit,
            expectErrors: async (query: string, errors: string[], warnings: string[] = []) => {
              const jsonBody = await sendESQLQuery(query);
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
        });
      });
    }
  }
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createRootWithCorePlugins, createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import {
  indexes,
  policies,
  unsupported_field,
  fields as fieldsHelper,
  enrichFields as enrichFieldsHelper,
} from '../../../__tests__/helpers';

const fields = [...fieldsHelper, { name: policies[0].matchField, type: 'keyword' }];
const enrichFieldsRaw = [...enrichFieldsHelper, { name: policies[0].matchField, type: 'keyword' }];

/**
 * Sets up the integration environment for the tests.
 */
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

type StringType = 'text' | 'keyword';
type NumberType = 'integer' | 'double' | 'long' | 'unsigned_long';
export type EsqlEnv = Awaited<ReturnType<typeof setupEsqlEnv>>;

/**
 * Sets up the ES|QL specific environment parts for the tests.
 */
export const setupEsqlEnv = async () => {
  const integrationEnv = await setupIntegrationEnv();
  const { esClient: es } = integrationEnv;
  const cleanup = async () => {
    await es.indices.delete({ index: indexes, ignore_unavailable: true }, { ignore: [404] });
    await es.indices.delete(
      { index: policies[0].sourceIndices[0], ignore_unavailable: true },
      { ignore: [404] }
    );
    for (const policy of policies) {
      await es.enrich.deletePolicy({ name: policy.name }, { ignore: [404] });
    }
  };
  const createIndexRequest = (
    index: string,
    fieldList: Array<{ name: string; type: string }>,
    stringType: StringType,
    numberType: NumberType
  ) => {
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
  };
  await cleanup();
  const setupIndicesPolicies = async (stringFieldType: StringType, numberFieldType: NumberType) => {
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
  };

  interface EsqlResultColumn {
    name: string;
    type: string;
  }
  type EsqlResultRow = Array<string | null>;
  interface EsqlTable {
    columns: EsqlResultColumn[];
    values: EsqlResultRow[];
  }

  const sendEsqlQuery = async (
    query: string
  ): Promise<{
    resp: EsqlTable | undefined;
    error: { message: string } | undefined;
  }> => {
    try {
      const resp = await es.transport.request<EsqlTable>({
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
  };

  return {
    integrationEnv,
    cleanup,
    createIndexRequest,
    setupIndicesPolicies,
    sendEsqlQuery,
  };
};

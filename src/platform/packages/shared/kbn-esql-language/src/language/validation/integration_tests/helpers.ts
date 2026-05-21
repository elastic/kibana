/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { createTestEsCluster } from '@kbn/test-es-server';
import { ToolingLog } from '@kbn/tooling-log';
import {
  enrichFields as enrichFieldsHelper,
  fields as fieldsHelper,
  indexes,
  policies,
  unsupported_field,
} from '../../../__tests__/language/helpers';

const fields = [...fieldsHelper, { name: policies[0].matchField, type: 'keyword' }];
const enrichFieldsRaw = [...enrichFieldsHelper, { name: policies[0].matchField, type: 'keyword' }];

export type StringType = 'text' | 'keyword';
export type NumberType = 'integer' | 'double' | 'long' | 'unsigned_long';
export type EsqlEnv = Awaited<ReturnType<typeof setupEsqlEnv>>;

export interface EsqlValidationTestCase {
  query: string;
  error: string[];
}

export interface EsqlValidationFixtures {
  testCases: EsqlValidationTestCase[];
}

interface EsqlResultColumn {
  name: string;
  type: string;
}

type EsqlResultRow = Array<string | null>;

interface EsqlTable {
  columns: EsqlResultColumn[];
  values: EsqlResultRow[];
}

interface EsqlErrorResponse {
  meta?: {
    body?: {
      error?: {
        reason?: string;
        root_cause?: Array<{ reason?: string }>;
      };
    };
  };
}

const nonIndexableFieldTypes = new Set(['date_period', 'null', 'time_duration', 'time_literal']);

const isIndexableField = ({ type }: { type: string }) =>
  !type.startsWith('counter_') && !nonIndexableFieldTypes.has(type);

const getEsqlErrorReason = (error: unknown): string => {
  const responseError = error as EsqlErrorResponse;
  return (
    responseError.meta?.body?.error?.root_cause?.[0]?.reason ??
    responseError.meta?.body?.error?.reason ??
    (error instanceof Error ? error.message : String(error))
  );
};

const getParams = (query: string) => {
  if (!query.includes('_tstart') && !query.includes('_tend')) {
    return [];
  }

  return [
    {
      _tstart: '2025-02-23T23:00:00.000Z',
    },
    {
      _tend: '2025-03-26T09:09:08.139Z',
    },
  ];
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
      properties: fieldList.reduce((memo: Record<string, MappingProperty>, { name, type }) => {
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
        if (type === 'aggregate_metric_double') {
          esType = 'double';
        }
        if (type === 'function_named_parameters' || type === 'unsupported') {
          esType = 'integer_range';
        }

        memo[name] = { type: esType } as MappingProperty;
        return memo;
      }, {}),
    },
  };
};

const setupIntegrationEnv = async () => {
  const es = createTestEsCluster({
    license: 'basic',
    log: new ToolingLog({
      level: 'debug',
      writeTo: process.stdout,
    }),
  });

  jest.setTimeout(es.getStartTimeout() + 100000);

  await es.start();

  const esClient = es.getClient();
  const shutdown = async () => {
    await es.cleanup();
  };

  return {
    es,
    esClient,
    shutdown,
  };
};

export const setupEsqlEnv = async () => {
  const integrationEnv = await setupIntegrationEnv();
  const es = integrationEnv.esClient;

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

  const setupIndicesPolicies = async (stringFieldType: StringType, numberFieldType: NumberType) => {
    await cleanup();

    const indexableFields = fields.filter(isIndexableField);

    for (const index of indexes) {
      await es.indices.create(
        createIndexRequest(
          index,
          /unsupported/.test(index) ? unsupported_field : indexableFields,
          stringFieldType,
          numberFieldType
        ),
        { ignore: [409] }
      );
    }

    for (const { sourceIndices, matchField } of policies.slice(0, 1)) {
      const enrichFields = [{ name: matchField, type: 'string' }].concat(enrichFieldsRaw);
      await es.indices.create(
        createIndexRequest(
          sourceIndices[0],
          enrichFields.filter(isIndexableField),
          stringFieldType,
          numberFieldType
        ),
        {
          ignore: [409],
        }
      );
    }

    for (const { name, sourceIndices, matchField, enrichFields } of policies) {
      await es.enrich.putPolicy(
        {
          name,
          match: {
            indices: sourceIndices,
            match_field: matchField,
            enrich_fields: enrichFields,
          },
        },
        { ignore: [409] }
      );
      await es.enrich.executePolicy({ name });
    }
  };

  const sendEsqlQuery = async (
    query: string
  ): Promise<{
    resp: EsqlTable | undefined;
    error: { message: string } | undefined;
  }> => {
    try {
      const params = getParams(query);
      const resp = await es.transport.request<EsqlTable>({
        method: 'POST',
        path: '/_query',
        body: {
          query,
          ...(params.length ? { params } : {}),
        },
      });
      return { resp, error: undefined };
    } catch (error) {
      return { resp: undefined, error: { message: getEsqlErrorReason(error) } };
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

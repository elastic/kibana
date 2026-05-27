/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EsqlQueryRequest,
  EsqlQueryResponse,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';
import { createTestEsCluster } from '@kbn/test-es-server';
import { ToolingLog } from '@kbn/tooling-log';
import { ESQL_NAMED_PARAMS_TYPE } from '../../../commands/definitions/types';
import {
  enrichFields as enrichFieldsHelper,
  fields as fieldsHelper,
  getCallbackMocks,
  indexes,
  policies,
  unsupported_field,
} from '../../../__tests__/language/helpers';
import { validateQuery } from '../validation';

export type EsqlEnv = Awaited<ReturnType<typeof setupEsqlEnv>>;

export interface EsqlValidationTestCase {
  query: string;
}

export interface EsqlValidationFixtures {
  testCases: EsqlValidationTestCase[];
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
const fields = [...fieldsHelper, { name: policies[0].matchField, type: 'keyword' }];
const enrichIndexFields = [
  ...enrichFieldsHelper,
  { name: policies[0].matchField, type: 'keyword' },
];
const timeRangeParams: NonNullable<EsqlQueryRequest['params']> = [
  {
    _tstart: '2026-04-20T23:00:00.000Z',
  },
  {
    _tend: '2026-05-20T09:09:08.139Z',
  },
];

const isIndexableField = ({ type }: { type: string }) =>
  !type.startsWith('counter_') && !nonIndexableFieldTypes.has(type);

// Keep this local to avoid a circular package dependency on @kbn/esql-utils.
const hasStartEndParams = (query: string) => /\?_tstart|\?_tend/i.test(query);

const getEsqlErrorReason = (error: unknown): string => {
  const responseError = error as EsqlErrorResponse;
  return (
    responseError.meta?.body?.error?.root_cause?.[0]?.reason ??
    responseError.meta?.body?.error?.reason ??
    (error instanceof Error ? error.message : String(error))
  );
};

const getParams = (query: string): NonNullable<EsqlQueryRequest['params']> => {
  if (!hasStartEndParams(query)) {
    return [];
  }

  return timeRangeParams;
};

const createIndexRequest = (index: string, fieldList: Array<{ name: string; type: string }>) => {
  return {
    index,
    mappings: {
      properties: fieldList.reduce((memo: Record<string, MappingProperty>, { name, type }) => {
        let esType = type;

        if (type === 'cartesian_point') {
          esType = 'point';
        }
        if (type === 'cartesian_shape') {
          esType = 'shape';
        }
        if (type === 'aggregate_metric_double') {
          esType = 'double';
        }
        if (type === ESQL_NAMED_PARAMS_TYPE || type === 'unsupported') {
          esType = 'integer_range';
        }

        memo[name] = { type: esType } as MappingProperty;
        return memo;
      }, {}),
    },
  };
};

export const runClientValidation = (query: string) => validateQuery(query, getCallbackMocks());

const setupIntegrationEnv = async () => {
  const es = createTestEsCluster({
    license: 'basic',
    log: new ToolingLog({
      level: 'warning',
      writeTo: process.stdout,
    }),
  });

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

  const uniqueSourceIndices = Array.from(
    new Set(policies.flatMap((policy) => policy.sourceIndices))
  );

  const cleanup = async () => {
    await es.indices.delete({ index: indexes, ignore_unavailable: true }, { ignore: [404] });
    await es.indices.delete(
      { index: uniqueSourceIndices, ignore_unavailable: true },
      { ignore: [404] }
    );
    for (const policy of policies) {
      await es.enrich.deletePolicy({ name: policy.name }, { ignore: [404] });
    }
  };

  const setupIndicesPolicies = async () => {
    await cleanup();

    const indexableFields = fields.filter(isIndexableField);
    const indexableEnrichFields = enrichIndexFields.filter(isIndexableField);

    for (const index of indexes) {
      await es.indices.create(
        createIndexRequest(index, /unsupported/.test(index) ? unsupported_field : indexableFields),
        { ignore: [409] }
      );
    }

    for (const sourceIndex of uniqueSourceIndices) {
      await es.indices.create(createIndexRequest(sourceIndex, indexableEnrichFields), {
        ignore: [409],
      });
    }

    for (const {
      name,
      sourceIndices,
      matchField: policyMatchField,
      enrichFields: policyEnrichFields,
    } of policies) {
      await es.enrich.putPolicy(
        {
          name,
          match: {
            indices: sourceIndices,
            match_field: policyMatchField,
            enrich_fields: policyEnrichFields,
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
    resp: EsqlQueryResponse | undefined;
    error: { message: string } | undefined;
  }> => {
    try {
      const params = getParams(query);
      const resp = await es.esql.query({
        query,
        ...(params.length ? { params } : {}),
      });
      return { resp, error: undefined };
    } catch (error) {
      return { resp: undefined, error: { message: getEsqlErrorReason(error) } };
    }
  };

  return {
    integrationEnv,
    cleanup,
    setupIndicesPolicies,
    sendEsqlQuery,
  };
};

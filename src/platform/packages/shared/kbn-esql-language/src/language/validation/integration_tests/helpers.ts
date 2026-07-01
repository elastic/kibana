/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsqlQueryResponse, MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { createTestEsCluster } from '@kbn/test-es-server';
import { ToolingLog } from '@kbn/tooling-log';
import { ESQL_NAMED_PARAMS_TYPE } from '../../../commands/definitions/types';
import {
  enrichFields as enrichFieldsHelper,
  fields as fieldsHelper,
  indexes,
  policies,
  unsupported_field,
} from '../../../__tests__/language/helpers';

export type EsqlEnv = Awaited<ReturnType<typeof setupEsqlEnv>>;

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

interface EsqlQueryResult {
  resp: EsqlQueryResponse | undefined;
  error: { message: string } | undefined;
}

const nonIndexableFieldTypes = new Set(['date_period', 'null', 'time_duration', 'time_literal']);
const fields = [...fieldsHelper, { name: policies[0].matchField, type: 'keyword' }];
const enrichIndexFields = [
  ...enrichFieldsHelper,
  { name: policies[0].matchField, type: 'keyword' },
];
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
          memo[name] = {
            type: 'aggregate_metric_double',
            metrics: ['min', 'max', 'sum', 'value_count'],
            default_metric: 'max',
          } as MappingProperty;
          return memo;
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

const setupIntegrationEnv = async () => {
  // ES-only: we spin up a local ES test cluster without Kibana.
  // Faster startup and fewer moving parts, while still validating against real ES responses.
  const es = createTestEsCluster({
    license: 'basic',
    log: new ToolingLog({
      level: 'warning',
      writeTo: process.stdout,
    }),
  });

  await es.start();

  const esClient = es.getClient();
  const stop = async () => {
    // Remove the ES test install after the suite to avoid leaving test artifacts behind.
    await es.cleanup();
  };

  return {
    es,
    esClient,
    stop,
  };
};

/**
 * Boots a local Elasticsearch cluster and prepares test indices and enrich policies.
 *
 * Warning: every call starts a new cluster and runs full setup — avoid calling this from
 * multiple `integration_tests/*.test.ts` files (each `beforeAll` would pay that cost again).
 *
 * This package uses the recommended pattern: one integration file (`validation_suites.test.ts`),
 * one `beforeAll(setupEsqlEnv)`, and shared `run*ValidationSuite(setup)` from `__tests__/*_suite.ts`.
 */
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

  const sendEsqlQuery = async (query: string): Promise<EsqlQueryResult> => {
    try {
      const resp = await es.esql.query({
        query,
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

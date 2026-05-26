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
import {
  ESQL_NAMED_PARAMS_TYPE,
  type ESQL_NUMERIC_DECIMAL_TYPES,
  type ESQL_STRING_TYPES,
} from '../../../commands/definitions/types';
import {
  enrichFields as enrichFieldsHelper,
  fields as fieldsHelper,
  getCallbackMocks,
  indexes,
  policies,
  unsupported_field,
} from '../../../__tests__/language/helpers';
import { validateQuery } from '../validation';

const fields = [...fieldsHelper, { name: policies[0].matchField, type: 'keyword' }];
const enrichFieldsRaw = [...enrichFieldsHelper, { name: policies[0].matchField, type: 'keyword' }];

type NumericDecimalType = (typeof ESQL_NUMERIC_DECIMAL_TYPES)[number];

export type StringType = (typeof ESQL_STRING_TYPES)[number];
export type NumberType =
  | 'integer'
  | Extract<NumericDecimalType, 'double' | 'long' | 'unsigned_long'>;
export type DateType = 'date' | 'date_nanos';
export type EsqlEnv = Awaited<ReturnType<typeof setupEsqlEnv>>;

export interface MappingVariant {
  name: string;
  stringFieldType: StringType;
  numberFieldType: NumberType;
  dateFieldType: DateType;
}

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
const timeRangeParams: NonNullable<EsqlQueryRequest['params']> = [
  {
    _tstart: '2026-04-20T23:00:00.000Z',
  },
  {
    _tend: '2026-05-20T09:09:08.139Z',
  },
];

const mappingVariantDimensions = {
  stringFieldTypes: ['text', 'keyword'] satisfies StringType[],
  numberFieldTypes: ['integer', 'long', 'double', 'unsigned_long'] satisfies NumberType[],
  dateFieldTypes: ['date', 'date_nanos'] satisfies DateType[],
};

export const mappingVariants: MappingVariant[] = mappingVariantDimensions.stringFieldTypes.flatMap(
  (stringFieldType) =>
    mappingVariantDimensions.numberFieldTypes.flatMap((numberFieldType) =>
      mappingVariantDimensions.dateFieldTypes.map((dateFieldType) => ({
        name: `${stringFieldType} strings, ${numberFieldType} numbers, ${dateFieldType} dates`,
        stringFieldType,
        numberFieldType,
        dateFieldType,
      }))
    )
);

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

const createIndexRequest = (
  index: string,
  fieldList: Array<{ name: string; type: string }>,
  mappingVariant: MappingVariant
) => {
  return {
    index,
    mappings: {
      properties: fieldList.reduce((memo: Record<string, MappingProperty>, { name, type }) => {
        let esType = type;

        if (type === 'string') {
          esType = mappingVariant.stringFieldType;
        }
        if (type === 'number') {
          esType = mappingVariant.numberFieldType;
        }
        if (type === 'date') {
          esType = mappingVariant.dateFieldType;
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
      level: 'debug',
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

  const setupIndicesPolicies = async (mappingVariant: MappingVariant) => {
    await cleanup();

    const indexableFields = fields.filter(isIndexableField);

    for (const index of indexes) {
      await es.indices.create(
        createIndexRequest(
          index,
          /unsupported/.test(index) ? unsupported_field : indexableFields,
          mappingVariant
        ),
        { ignore: [409] }
      );
    }

    for (const { sourceIndices, matchField } of policies.slice(0, 1)) {
      const enrichFields = [{ name: matchField, type: 'string' }].concat(enrichFieldsRaw);
      await es.indices.create(
        createIndexRequest(sourceIndices[0], enrichFields.filter(isIndexableField), mappingVariant),
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

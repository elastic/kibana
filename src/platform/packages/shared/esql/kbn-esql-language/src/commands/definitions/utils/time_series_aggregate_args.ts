/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isColumn, isIdentifier } from '@elastic/esql';
import type { ESQLAstItem } from '@elastic/esql/types';
import { timeSeriesAggregates } from '@elastic/esql-definitions/time-series-aggregates';
import { FunctionDefinitionTypes, isFieldType, type SupportedDataType } from '../types';

/**
 * Rewrites bare column arguments of an aggregate in a TS pipeline to the type
 * of the implicit time-series aggregate Elasticsearch inserts before the outer function.
 */
export const applyTimeSeriesAggregateArgTypes = (
  args: ESQLAstItem[],
  argTypes: Array<SupportedDataType | 'unknown'>,
  isTimeseriesSource: boolean,
  functionType: string | undefined
): Array<SupportedDataType | 'unknown'> => {
  if (!isTimeseriesSource || functionType !== FunctionDefinitionTypes.AGG) {
    return argTypes;
  }

  return argTypes.map((argType, index) => {
    const arg = args[index];
    const bare = Array.isArray(arg) ? arg[0] : arg;
    if (!bare || Array.isArray(bare) || (!isColumn(bare) && !isIdentifier(bare))) {
      return argType;
    }

    const conversion = timeSeriesAggregates[argType];
    if (!conversion || !isFieldType(conversion.returnType)) {
      return argType;
    }

    return conversion.returnType;
  });
};

/**
 * Field types worth suggesting for an aggregate argument in a TS pipeline.
 * Elasticsearch wraps a bare field before the outer aggregate, so a parameter that
 * accepts the wrapped type also accepts the original field type.
 */
export const getTimeSeriesAggregateFieldTypes = (
  acceptedTypes: readonly string[],
  isTimeseriesSource: boolean,
  functionType: string | undefined
): string[] => {
  if (
    !isTimeseriesSource ||
    functionType !== FunctionDefinitionTypes.AGG ||
    acceptedTypes.includes('any')
  ) {
    return [];
  }

  const accepted = new Set(acceptedTypes);

  return Object.entries(timeSeriesAggregates).flatMap(([fieldType, conversion]) => {
    if (
      fieldType === conversion.returnType ||
      !isFieldType(fieldType) ||
      !isFieldType(conversion.returnType) ||
      !accepted.has(conversion.returnType) ||
      accepted.has(fieldType)
    ) {
      return [];
    }

    return [fieldType];
  });
};

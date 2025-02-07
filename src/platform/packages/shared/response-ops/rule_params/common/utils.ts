/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { buildEsQuery as kbnBuildEsQuery } from '@kbn/es-query';

export enum Comparator {
  GT = '>',
  LT = '<',
  GT_OR_EQ = '>=',
  LT_OR_EQ = '<=',
  BETWEEN = 'between',
  NOT_BETWEEN = 'notBetween',
}

export type ComparatorFn = (value: number, threshold: number[]) => boolean;

const TimeWindowUnits = new Set(['s', 'm', 'h', 'd']);
const AggTypes = new Set(['count', 'avg', 'min', 'max', 'sum']);

export const jobsSelectionSchema = schema.object(
  {
    jobIds: schema.arrayOf(schema.string(), { defaultValue: [] }),
    groupIds: schema.arrayOf(schema.string(), { defaultValue: [] }),
  },
  {
    validate: (v) => {
      if (!v.jobIds?.length && !v.groupIds?.length) {
        return i18n.translate('xpack.ml.alertTypes.anomalyDetection.jobSelection.errorMessage', {
          defaultMessage: 'Job selection is required',
        });
      }
    },
  }
);

export const oneOfLiterals = (arrayOfLiterals: Readonly<string[]>) =>
  schema.string({
    validate: (value) =>
      arrayOfLiterals.includes(value) ? undefined : `must be one of ${arrayOfLiterals.join(' | ')}`,
  });

export const validateIsStringElasticsearchJSONFilter = (value: string) => {
  if (value === '') {
    // Allow clearing the filter.
    return;
  }

  const errorMessage = 'filterQuery must be a valid Elasticsearch filter expressed in JSON';
  try {
    const parsedValue = JSON.parse(value);
    if (!isEmpty(parsedValue.bool)) {
      return undefined;
    }
    return errorMessage;
  } catch (e) {
    return errorMessage;
  }
};

export const validateKQLStringFilter = (value: string) => {
  if (value === '') {
    // Allow clearing the filter.
    return;
  }

  try {
    kbnBuildEsQuery(undefined, [{ query: value, language: 'kuery' }], [], {
      allowLeadingWildcards: true,
      queryStringOptions: {},
      ignoreFilterIfFieldNotInIndex: false,
    });
  } catch (e) {
    return i18n.translate(
      'xpack.responseOps.ruleParams.customThreshold.schema.invalidFilterQuery',
      {
        defaultMessage: 'filterQuery must be a valid KQL filter (error: {errorMessage})',
        values: { errorMessage: e?.message },
      }
    );
  }
};

export type TimeUnitChar = 's' | 'm' | 'h' | 'd';

export enum LEGACY_COMPARATORS {
  OUTSIDE_RANGE = 'outside',
}

export function validateTimeWindowUnits(timeWindowUnit: string): string | undefined {
  if (TimeWindowUnits.has(timeWindowUnit)) {
    return;
  }

  return i18n.translate(
    'xpack.triggersActionsUI.data.coreQueryParams.invalidTimeWindowUnitsErrorMessage',
    {
      defaultMessage: 'invalid timeWindowUnit: "{timeWindowUnit}"',
      values: {
        timeWindowUnit,
      },
    }
  );
}

export function validateAggType(aggType: string): string | undefined {
  if (AggTypes.has(aggType)) {
    return;
  }

  return i18n.translate('xpack.triggersActionsUI.data.coreQueryParams.invalidAggTypeErrorMessage', {
    defaultMessage: 'invalid aggType: "{aggType}"',
    values: {
      aggType,
    },
  });
}

export function validateGroupBy(groupBy: string): string | undefined {
  if (groupBy === 'all' || groupBy === 'top') {
    return;
  }

  return i18n.translate('xpack.triggersActionsUI.data.coreQueryParams.invalidGroupByErrorMessage', {
    defaultMessage: 'invalid groupBy: "{groupBy}"',
    values: {
      groupBy,
    },
  });
}

export const ComparatorFns = new Map<Comparator, ComparatorFn>([
  [Comparator.LT, (value: number, threshold: number[]) => value < threshold[0]],
  [Comparator.LT_OR_EQ, (value: number, threshold: number[]) => value <= threshold[0]],
  [Comparator.GT_OR_EQ, (value: number, threshold: number[]) => value >= threshold[0]],
  [Comparator.GT, (value: number, threshold: number[]) => value > threshold[0]],
  [
    Comparator.BETWEEN,
    (value: number, threshold: number[]) => value >= threshold[0] && value <= threshold[1],
  ],
  [
    Comparator.NOT_BETWEEN,
    (value: number, threshold: number[]) => value < threshold[0] || value > threshold[1],
  ],
]);

export const getComparatorSchemaType = (validate: (comparator: Comparator) => string | void) =>
  schema.oneOf(
    [
      schema.literal(Comparator.GT),
      schema.literal(Comparator.LT),
      schema.literal(Comparator.GT_OR_EQ),
      schema.literal(Comparator.LT_OR_EQ),
      schema.literal(Comparator.BETWEEN),
      schema.literal(Comparator.NOT_BETWEEN),
    ],
    { validate }
  );

export const ComparatorFnNames = new Set(ComparatorFns.keys());

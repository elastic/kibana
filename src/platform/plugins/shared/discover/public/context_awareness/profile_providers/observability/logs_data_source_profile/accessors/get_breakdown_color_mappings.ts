/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiThemeComputed } from '@elastic/eui';
import type { ColorMapping } from '@kbn/coloring';
import {
  getLogLevelColor,
  logLevelSynonyms,
  severityOrder,
  type LogLevelCoalescedValue,
} from '@kbn/discover-utils';
import { capitalize, uniq } from 'lodash';
import { LOG_LEVEL_FIELDS } from '../../../../../../common/data_types/logs/constants';
import type { DataSourceProfileProvider } from '../../../../profiles';
import type { BreakdownColorMapping } from '../../../../types';

const getCaseVariants = (value: string): string[] => [
  value,
  value.toUpperCase(),
  capitalize(value),
];

/**
 * The raw `log.level` values that coalesce to the given level. Chart colour rules only match exact
 * values, so the level, its known synonyms and their common casings are all listed.
 */
export const getLogLevelRawValues = (level: LogLevelCoalescedValue): string[] => {
  const synonyms = Object.entries(logLevelSynonyms)
    .filter(([, coalescedValue]) => coalescedValue === level)
    .map(([synonym]) => synonym);

  return uniq([level, ...synonyms].flatMap(getCaseVariants));
};

/**
 * Builds a breakdown colour mapping that colours log levels like the data grid does.
 */
export const buildLogLevelBreakdownColorMapping = (
  euiTheme: EuiThemeComputed
): BreakdownColorMapping => {
  const assignments: ColorMapping.Config['assignments'] = severityOrder.flatMap((level) => {
    const colorCode = getLogLevelColor(level, euiTheme);

    if (!colorCode) {
      return [];
    }

    return [
      {
        rules: getLogLevelRawValues(level).map((value) => ({ type: 'raw' as const, value })),
        color: { type: 'colorCode' as const, colorCode },
      },
    ];
  });

  return {
    colorMapping: {
      paletteId: 'default',
      colorMode: { type: 'categorical' },
      assignments,
      specialAssignments: [{ rules: [{ type: 'other' }], color: { type: 'loop' } }],
    },
  };
};

export const getBreakdownColorMappings: DataSourceProfileProvider['profile']['getBreakdownColorMappings'] =
  (prev) => (params) => {
    const logLevelColorMapping = buildLogLevelBreakdownColorMapping(params.euiTheme);

    return {
      ...prev(params),
      ...Object.fromEntries(LOG_LEVEL_FIELDS.map((field) => [field, logLevelColorMapping])),
    };
  };

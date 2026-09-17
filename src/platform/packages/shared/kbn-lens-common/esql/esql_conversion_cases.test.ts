/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildEsqlConversionCasesByGroup,
  createEsqlConversionIndexPattern,
  createEsqlConversionUiSettings,
  ESQL_CONVERSION_DATE_RANGE,
  ESQL_CONVERSION_NOW,
  type EsqlConversionCase,
} from '@kbn/lens-test-helpers';
import type { DateRange, IndexPattern } from '../types';
import type { FormBasedLayer, GenericIndexPatternColumn } from '../datasources/types';
import { generateEsqlQuery } from './generate_esql_query';

const uiSettings = createEsqlConversionUiSettings();

// Cases bind to the same sample-data indices the Scout API layer installs,
// so unit and API layers pin the exact same queries.
const runCase = (conversionCase: EsqlConversionCase) => {
  const indexPattern = createEsqlConversionIndexPattern(
    conversionCase.dataset
  ) as unknown as IndexPattern;
  const columns = conversionCase.columns as unknown as Record<string, GenericIndexPatternColumn>;
  const layer = {
    indexPatternId: conversionCase.dataset.index,
    columns,
    columnOrder: [...conversionCase.columnOrder],
  } as unknown as FormBasedLayer;
  const esAggEntries = conversionCase.columnOrder.map((colId) => [colId, columns[colId]] as const);

  // omitDateRange models a detached time picker (auto date histograms fall
  // back to a 1h fixed interval).
  const dateRange = conversionCase.omitDateRange
    ? ({ fromDate: undefined, toDate: undefined } as unknown as DateRange)
    : ESQL_CONVERSION_DATE_RANGE;

  const result = generateEsqlQuery(
    esAggEntries,
    layer,
    indexPattern,
    uiSettings,
    dateRange,
    ESQL_CONVERSION_NOW,
    conversionCase.columnRoles ? { ...conversionCase.columnRoles } : undefined
  );

  if (conversionCase.expected.success) {
    expect(result).toMatchObject({ success: true, esql: conversionCase.expected.esql });
    if (result.success) {
      // esAggsIdMap keys are the ES|QL output column names (insertion
      // order differs from table order, so compare as sets).
      expect(Object.keys(result.esAggsIdMap).sort()).toEqual(
        [...conversionCase.expected.columnNames].sort()
      );
      const sourceIdsByOutputColumn = Object.fromEntries(
        Object.entries(result.esAggsIdMap).map(([columnName, originalColumns]) => [
          columnName,
          originalColumns.map(({ id }) => id),
        ])
      );
      expect(sourceIdsByOutputColumn).toEqual(conversionCase.expected.expectedSourceIds);
      for (const [columnName, format] of Object.entries(
        conversionCase.expected.expectedFormats ?? {}
      )) {
        expect(result.esAggsIdMap[columnName][0].format).toEqual(format);
      }
      for (const [columnName, label] of Object.entries(
        conversionCase.expected.expectedLabels ?? {}
      )) {
        expect(result.esAggsIdMap[columnName][0].label).toBe(label);
      }
    }
  } else {
    expect(result).toMatchObject({ success: false, reason: conversionCase.expected.reason });
  }
};

const casesByGroup = buildEsqlConversionCasesByGroup();

describe('form-based → ES|QL conversion case matrix (generation assertions)', () => {
  for (const [group, cases] of Object.entries(casesByGroup)) {
    describe(group, () => {
      for (const conversionCase of cases) {
        it(`converts: ${conversionCase.description}`, () => {
          runCase(conversionCase);
        });
      }
    });
  }
});

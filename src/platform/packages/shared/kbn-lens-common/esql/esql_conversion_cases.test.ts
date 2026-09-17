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
  createEsqlConversionInput,
  type EsqlConversionCase,
  type FailedEsqlConversionCase,
  isFailedEsqlConversionCase,
  type SuccessfulEsqlConversionCase,
  isSuccessfulEsqlConversionCase,
} from '@kbn/lens-test-helpers';
import type { DateRange, IndexPattern } from '../types';
import type { FormBasedLayer, GenericIndexPatternColumn } from '../datasources/types';
import { generateEsqlQuery } from './generate_esql_query';

// Cases bind to the same sample-data indices the Scout API layer installs,
// so unit and API layers pin the exact same queries.
const generateQueryForCase = (conversionCase: EsqlConversionCase) => {
  const { esAggEntries, layer, indexPattern, uiSettings, dateRange, now, columnRoles } =
    createEsqlConversionInput(conversionCase);

  // Shared test helpers intentionally model only the fields these cases need and stay
  // independent of Lens production types to avoid a package dependency cycle. Cast through
  // unknown because these limited fixture types do not implement the full Lens contracts.
  return generateEsqlQuery(
    esAggEntries as unknown as Array<readonly [string, GenericIndexPatternColumn]>,
    layer as unknown as FormBasedLayer,
    indexPattern as unknown as IndexPattern,
    uiSettings,
    dateRange as unknown as DateRange,
    now,
    columnRoles
  );
};

const runSuccessfulCase = (conversionCase: SuccessfulEsqlConversionCase) => {
  const result = generateQueryForCase(conversionCase);

  expect(result).toMatchObject({ success: true, esql: conversionCase.expected.esql });
  if (!result.success) {
    throw new Error(`Expected successful conversion for: ${conversionCase.description}`);
  }

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
  for (const [columnName, label] of Object.entries(conversionCase.expected.expectedLabels ?? {})) {
    expect(result.esAggsIdMap[columnName][0].label).toBe(label);
  }
};

const runFailedCase = (conversionCase: FailedEsqlConversionCase) => {
  const result = generateQueryForCase(conversionCase);

  expect(result).toMatchObject({ success: false, reason: conversionCase.expected.reason });
};

const casesByGroup = buildEsqlConversionCasesByGroup();

describe('form-based → ES|QL conversion case matrix (generation assertions)', () => {
  for (const [group, cases] of Object.entries(casesByGroup)) {
    describe(group, () => {
      const successfulCases = cases.filter(isSuccessfulEsqlConversionCase);
      const failedCases = cases.filter(isFailedEsqlConversionCase);

      for (const conversionCase of successfulCases) {
        it(`converts: ${conversionCase.description}`, () => {
          runSuccessfulCase(conversionCase);
        });
      }

      for (const conversionCase of failedCases) {
        it(`does not convert: ${conversionCase.description}`, () => {
          runFailedCase(conversionCase);
        });
      }
    });
  }
});

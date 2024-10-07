/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  minMaxAvgLoC,
  updateMin,
  updateMax,
  getIndexPatternTelemetry,
} from './register_index_pattern_usage_collection';
import { SavedObjectsClient } from '@kbn/core/server';

const scriptA = 'emit(0);';
const scriptB = 'emit(1);\nemit(2);';
const scriptC = 'emit(3);\nemit(4)\nemit(5)';

const scriptedFieldA = { script: scriptA };
const scriptedFieldB = { script: scriptB };
const scriptedFieldC = { script: scriptC };

const runtimeFieldA = { script: { source: scriptA } };
const runtimeFieldB = { script: { source: scriptB } };
const runtimeFieldC = { script: { source: scriptC } };

let returnedSavedObjects = [
  {
    attributes: {},
  },
];

const savedObjects = {
  createPointInTimeFinder: jest.fn().mockReturnValue({
    find: jest.fn().mockImplementation(async function* () {
      yield await Promise.resolve({
        total: 3,
        saved_objects: returnedSavedObjects,
      });
    }),
    close: jest.fn(),
  }),
} as any as SavedObjectsClient;

describe('index pattern usage collection', () => {
  it('minMaxAvgLoC calculates min, max, and average ', () => {
    const scripts = [scriptA, scriptB, scriptC];
    expect(minMaxAvgLoC(scripts)).toEqual({ min: 1, max: 3, avg: 2 });
    expect(minMaxAvgLoC([undefined, undefined, undefined])).toEqual({ min: 0, max: 0, avg: 0 });
  });

  it('updateMin returns minimum value', () => {
    expect(updateMin(undefined, 1)).toEqual(1);
    expect(updateMin(1, 0)).toEqual(0);
  });

  it('updateMax returns maximum value', () => {
    expect(updateMax(undefined, 1)).toEqual(1);
    expect(updateMax(1, 0)).toEqual(1);
  });

  describe('calculates index pattern usage', () => {
    const countSummaryDefault = {
      min: undefined,
      max: undefined,
      avg: undefined,
    };

    it('when there are no runtime fields or scripted fields', async () => {
      expect(await getIndexPatternTelemetry(savedObjects)).toEqual({
        indexPatternsCount: 3,
        indexPatternsWithScriptedFieldCount: 0,
        indexPatternsWithRuntimeFieldCount: 0,
        scriptedFieldCount: 0,
        runtimeFieldCount: 0,
        perIndexPattern: {
          scriptedFieldCount: countSummaryDefault,
          runtimeFieldCount: countSummaryDefault,
          scriptedFieldLineCount: countSummaryDefault,
          runtimeFieldLineCount: countSummaryDefault,
        },
      });
    });

    it('when there are both runtime fields or scripted fields', async () => {
      const dataView = {
        attributes: {
          fields: JSON.stringify([scriptedFieldA, scriptedFieldB, scriptedFieldC]),
          runtimeFieldMap: JSON.stringify({
            runtimeFieldA,
            runtimeFieldB,
            runtimeFieldC,
          }),
        },
      };

      returnedSavedObjects = [dataView, dataView, dataView];

      expect(await getIndexPatternTelemetry(savedObjects)).toEqual({
        indexPatternsCount: 3,
        indexPatternsWithScriptedFieldCount: 3,
        indexPatternsWithRuntimeFieldCount: 3,
        scriptedFieldCount: 9,
        runtimeFieldCount: 9,
        perIndexPattern: {
          scriptedFieldCount: { min: 3, max: 3, avg: 3 },
          runtimeFieldCount: { min: 3, max: 3, avg: 3 },
          scriptedFieldLineCount: { min: 1, max: 3, avg: 2 },
          runtimeFieldLineCount: { min: 1, max: 3, avg: 2 },
        },
      });
    });

    it('when there are only runtime fields', async () => {
      const dataView = {
        attributes: {
          fields: JSON.stringify([]),
          runtimeFieldMap: JSON.stringify({
            runtimeFieldA,
            runtimeFieldB,
            runtimeFieldC,
          }),
        },
      };

      returnedSavedObjects = [dataView, dataView, dataView];

      expect(await getIndexPatternTelemetry(savedObjects)).toEqual({
        indexPatternsCount: 3,
        indexPatternsWithScriptedFieldCount: 0,
        indexPatternsWithRuntimeFieldCount: 3,
        scriptedFieldCount: 0,
        runtimeFieldCount: 9,
        perIndexPattern: {
          scriptedFieldCount: countSummaryDefault,
          runtimeFieldCount: { min: 3, max: 3, avg: 3 },
          scriptedFieldLineCount: countSummaryDefault,
          runtimeFieldLineCount: { min: 1, max: 3, avg: 2 },
        },
      });
    });

    it('when there are only scripted fields', async () => {
      const dataView = {
        attributes: {
          fields: JSON.stringify([scriptedFieldA, scriptedFieldB, scriptedFieldC]),
          runtimeFieldMap: JSON.stringify({}),
        },
      };

      returnedSavedObjects = [dataView, dataView, dataView];

      expect(await getIndexPatternTelemetry(savedObjects)).toEqual({
        indexPatternsCount: 3,
        indexPatternsWithScriptedFieldCount: 3,
        indexPatternsWithRuntimeFieldCount: 0,
        scriptedFieldCount: 9,
        runtimeFieldCount: 0,
        perIndexPattern: {
          scriptedFieldCount: { min: 3, max: 3, avg: 3 },
          runtimeFieldCount: countSummaryDefault,
          scriptedFieldLineCount: { min: 1, max: 3, avg: 2 },
          runtimeFieldLineCount: countSummaryDefault,
        },
      });
    });
  });
});

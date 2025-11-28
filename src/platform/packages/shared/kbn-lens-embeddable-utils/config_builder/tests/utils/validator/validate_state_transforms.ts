/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LensConfigBuilder } from '../../../config_builder';
import { lensApiStateSchema } from '../../../schema';
import type { ValidateTransform } from './types';
import { getChartSchema } from './schema';
import { getChartCanonicalizer } from './canonicalizers';
import { unsetMany } from '../unset_many';

/**
 * Test harness to validate LensConfigBuilder conversions
 *
 * - Starts with LensAttributes
 * - Converts to API format
 * - Validates against the provided schema
 * - Validates against the general lensApiStateSchema
 * - Converts back to LensAttributes
 * - Converts new LensAttributes to API format
 * - Validates against the provided schema
 * - Validates against the general lensApiStateSchema
 */
export function validateStateTransformsFn(chartType: string): ValidateTransform['fromState'] {
  const schema = getChartSchema(chartType);
  const canonicalizer = getChartCanonicalizer(chartType);
  const builder = new LensConfigBuilder(undefined, true);

  return function validateStateTransforms(attributes, strict = false, excludedFields = []) {
    const newApiConfig = builder.toAPIFormat(attributes);

    expect(() => {
      schema.validate(newApiConfig);
    }).not.toThrow();

    expect(() => {
      lensApiStateSchema.validate(newApiConfig);
    }).not.toThrow();

    const newLensAttributes = builder.fromAPIFormat(newApiConfig);

    // Temporary strict mode, all checks should eventually be strict
    if (strict) {
      const ignoredFields = getExcludedFieldsByChartType(chartType, excludedFields);
      const newAttributes = unsetMany(newLensAttributes, ignoredFields);
      const originalAttributes = unsetMany(
        canonicalizer?.(attributes) ?? attributes,
        ignoredFields
      );

      expect(newAttributes).toEqual(originalAttributes);
    }

    const newApiConfig2 = builder.toAPIFormat(newLensAttributes);

    expect(() => {
      schema.validate(newApiConfig2);
    }).not.toThrow();

    expect(() => {
      lensApiStateSchema.validate(newApiConfig2);
    }).not.toThrow();

    expect(newApiConfig).toEqual(newApiConfig2);
  };
}

const defaultExcludedFieldsByChartType = {
  metric: [
    'state.visualization.showBar',
    'state.visualization.valueFontMode',
    'state.visualization.secondaryLabelPosition',
    'state.visualization.secondaryTrend',
  ],
} as const satisfies Record<string, string[]>;

export function getExcludedFieldsByChartType(
  chartType: string,
  excludedFields: string[] = []
): string[] {
  return ((defaultExcludedFieldsByChartType as any)[chartType] ?? []).concat(excludedFields);
}

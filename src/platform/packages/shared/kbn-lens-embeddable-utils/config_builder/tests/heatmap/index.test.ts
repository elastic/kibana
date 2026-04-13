/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { heatmapConfigSchema } from '../../schema/charts/heatmap';
import { validateConverter } from '../validate';
import * as dslMocks from './dsl.mocks';
import * as esqlMocks from './esql.mocks';

describe('Heatmap', () => {
  describe('DSL', () => {
    it('should convert a simple heatmap', () => {
      validateConverter(dslMocks.simple, heatmapConfigSchema);
    });

    it('should convert a heatmap with x and y axes', () => {
      validateConverter(dslMocks.withXAndYAxes, heatmapConfigSchema);
    });

    it('should convert a heatmap with dynamic colors', () => {
      validateConverter(dslMocks.withDynamicColors, heatmapConfigSchema);
    });

    it('should convert a heatmap with sort predicates', () => {
      validateConverter(dslMocks.withSortPredicates, heatmapConfigSchema);
    });

    it('should convert a default color by value palette', () => {
      validateConverter(dslMocks.defaultColorByValueAttributes, heatmapConfigSchema);
    });

    it('should convert a selector color by value palette', () => {
      validateConverter(dslMocks.selectorColorByValueAttributes, heatmapConfigSchema);
    });
  });

  describe('ESQL', () => {
    it('should convert a simple heatmap', () => {
      validateConverter(esqlMocks.simple, heatmapConfigSchema);
    });

    it('should convert a heatmap with x and y axes', () => {
      validateConverter(esqlMocks.withXAndYAxes, heatmapConfigSchema);
    });

    it('should convert a heatmap with sort predicates', () => {
      validateConverter(esqlMocks.withSortPredicates, heatmapConfigSchema);
    });
  });
});

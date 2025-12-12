/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { heatmapStateSchema } from '../../schema/charts/heatmap';
import { validateConverter } from '../validate';
import * as dslMocks from './dsl.mocks';
import * as esqlMocks from './esql.mocks';

describe('Heatmap', () => {
  describe('DSL', () => {
    it('should convert a simple heatmap', () => {
      validateConverter(dslMocks.simple, heatmapStateSchema);
    });

    it('should convert a heatmap with x and y axes', () => {
      validateConverter(dslMocks.withXAndYAxes, heatmapStateSchema);
    });

    it('should convert a heatmap with dynamic colors', () => {
      validateConverter(dslMocks.withDynamicColors, heatmapStateSchema);
    });
  });

  describe('ESQL', () => {
    it('should convert a simple heatmap', () => {
      validateConverter(esqlMocks.simple, heatmapStateSchema);
    });

    it('should convert a heatmap with x and y axes', () => {
      validateConverter(esqlMocks.withXAndYAxes, heatmapStateSchema);
    });
  });
});

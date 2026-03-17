/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validator } from '../utils/validator';
import * as dslMocks from './dsl.mocks';
import * as esqlMocks from './esql.mocks';

describe('Heatmap', () => {
  describe('state transform validation', () => {
    describe('DSL', () => {
      it('should convert a simple heatmap', () => {
        validator.heatmap.fromState(dslMocks.simple);
      });

      it('should convert a heatmap with x and y axes', () => {
        validator.heatmap.fromState(dslMocks.withXAndYAxes);
      });

      it('should convert a heatmap with dynamic colors', () => {
        validator.heatmap.fromState(dslMocks.withDynamicColors);
      });

      it('should convert a heatmap with sort predicates', () => {
        validator.heatmap.fromState(dslMocks.withSortPredicates);
      });

      it('should convert a default color by value palette', () => {
        validator.heatmap.fromState(dslMocks.defaultColorByValueAttributes);
      });

      it('should convert a selector color by value palette', () => {
        validator.heatmap.fromState(dslMocks.selectorColorByValueAttributes);
      });
    });

    describe('ESQL', () => {
      it('should convert a simple heatmap', () => {
        validator.heatmap.fromState(esqlMocks.simple);
      });

      it('should convert a heatmap with x and y axes', () => {
        validator.heatmap.fromState(esqlMocks.withXAndYAxes);
      });

      it('should convert a heatmap with sort predicates', () => {
        validator.heatmap.fromState(esqlMocks.withSortPredicates);
      });
    });
  });

  describe('api transform validation', () => {
    describe('DSL', () => {
      it.todo('should convert various dsl heatmap configs');
    });

    describe('ESQL', () => {
      it.todo('should convert various esql heatmap configs');
    });
  });
});

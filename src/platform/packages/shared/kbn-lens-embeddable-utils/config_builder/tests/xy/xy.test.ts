/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYState as XYLensState } from '@kbn/lens-common';
import { xyStateSchema } from '../../schema/charts/xy';
import type { LensAttributes } from '../../types';
import { validateConverter } from '../validate';
import {
  barWithTwoLayersAttributes,
  breakdownXY,
  fullBasicXY,
  minimalAttributesXY,
  mixedChartAttributes,
  multipleMetricsXY,
} from './basicXY.mock';
import { dualReferenceLineXY, referenceLineXY } from './referenceLines.mock';
import { annotationXY } from './annotations.mock';
import { esqlChart } from './esqlXY.mock';

function setSeriesType(attributes: LensAttributes, seriesType: 'bar' | 'line' | 'area') {
  return {
    ...attributes,
    state: {
      ...attributes.state,
      visualization: {
        ...(attributes.state.visualization as XYLensState),
        layers: (attributes.state.visualization as XYLensState).layers.map((layer) => {
          if (!layer.layerType || layer.layerType === 'data') {
            return {
              ...layer,
              seriesType,
            };
          }
          return layer;
        }),
      },
    },
  };
}

describe('XY', () => {
  describe('Data only', () => {
    for (const type of ['bar', 'line', 'area'] as const) {
      it(`should convert a minimal ${type} chart with one data layer`, () => {
        validateConverter(setSeriesType(minimalAttributesXY, type), xyStateSchema);
      });
    }

    it(`should convert a full xy chart with one data layer`, () => {
      validateConverter(fullBasicXY, xyStateSchema);
    });

    it(`should convert a xy chart with multiple metrics`, () => {
      validateConverter(multipleMetricsXY, xyStateSchema);
    });

    it(`should convert a xy chart with multiple metrics and a breakdown`, () => {
      validateConverter(breakdownXY, xyStateSchema);
    });

    it('should convert a bar chart with 2 layers', () => {
      validateConverter(barWithTwoLayersAttributes, xyStateSchema);
    });

    it('should convert a mixed chart with 3 layers', () => {
      validateConverter(mixedChartAttributes, xyStateSchema);
    });
  });

  describe('Reference lines', () => {
    for (const type of ['bar', 'line', 'area'] as const) {
      it(`should work for a reference line with a ${type} chart`, () => {
        validateConverter(setSeriesType(referenceLineXY, type), xyStateSchema);
      });
    }

    it('should work for both horizontal and vertical reference lines', () => {
      validateConverter(dualReferenceLineXY, xyStateSchema);
    });
  });

  describe('Annotations', () => {
    for (const type of ['bar', 'line', 'area'] as const) {
      it(`should work for an annotation with a ${type} chart`, () => {
        validateConverter(setSeriesType(annotationXY, type), xyStateSchema);
      });
    }
  });

  describe('ES|QL panels', () => {
    for (const type of ['bar', 'line', 'area'] as const) {
      it(`should work for an annotation with a ${type} chart`, () => {
        validateConverter(setSeriesType(esqlChart, type), xyStateSchema);
      });
    }
  });
});

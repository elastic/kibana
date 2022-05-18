/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './reference_lines.scss';

import React from 'react';
import { Position } from '@elastic/charts';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { CommonXYReferenceLineLayerConfig } from '../../../common/types';
import { isReferenceLine, mapVerticalToHorizontalPlacement } from '../../helpers';
import { ReferenceLineLayer } from './reference_line_layer';
import { ReferenceLine } from './reference_line';

export const computeChartMargins = (
  referenceLinePaddings: Partial<Record<Position, number>>,
  labelVisibility: Partial<Record<'x' | 'yLeft' | 'yRight', boolean>>,
  titleVisibility: Partial<Record<'x' | 'yLeft' | 'yRight', boolean>>,
  axesMap: Record<'left' | 'right', unknown>,
  isHorizontal: boolean
) => {
  const result: Partial<Record<Position, number>> = {};
  if (!labelVisibility?.x && !titleVisibility?.x && referenceLinePaddings.bottom) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('bottom') : 'bottom';
    result[placement] = referenceLinePaddings.bottom;
  }
  if (
    referenceLinePaddings.left &&
    (isHorizontal || (!labelVisibility?.yLeft && !titleVisibility?.yLeft))
  ) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('left') : 'left';
    result[placement] = referenceLinePaddings.left;
  }
  if (
    referenceLinePaddings.right &&
    (isHorizontal || !axesMap.right || (!labelVisibility?.yRight && !titleVisibility?.yRight))
  ) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('right') : 'right';
    result[placement] = referenceLinePaddings.right;
  }
  // there's no top axis, so just check if a margin has been computed
  if (referenceLinePaddings.top) {
    const placement = isHorizontal ? mapVerticalToHorizontalPlacement('top') : 'top';
    result[placement] = referenceLinePaddings.top;
  }
  return result;
};

export interface ReferenceLinesProps {
  layers: CommonXYReferenceLineLayerConfig[];
  formatters: Record<'left' | 'right' | 'bottom', FieldFormat | undefined>;
  axesMap: Record<'left' | 'right', boolean>;
  isHorizontal: boolean;
  paddingMap: Partial<Record<Position, number>>;
}

export const ReferenceLines = ({ layers, ...rest }: ReferenceLinesProps) => {
  return (
    <>
      {layers.flatMap((layer) => {
        if (!layer.yConfig) {
          return null;
        }

        if (isReferenceLine(layer)) {
          return <ReferenceLine key={`referenceLine-${layer.layerId}`} layer={layer} {...rest} />;
        }

        return (
          <ReferenceLineLayer key={`referenceLine-${layer.layerId}`} layer={layer} {...rest} />
        );
      })}
    </>
  );
};

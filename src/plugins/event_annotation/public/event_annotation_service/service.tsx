/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventAnnotationServiceType } from './types';
import { defaultAnnotationColor, defaultAnnotationLabel } from './helpers';
import { EventAnnotationConfig } from '../../common';
import { RangeEventAnnotationConfig } from '../../common/types';

export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

const isRangeAnnotation = (
  annotation?: EventAnnotationConfig
): annotation is RangeEventAnnotationConfig => {
  return Boolean(annotation && annotation?.key.type === 'range');
};

export function getEventAnnotationService(): EventAnnotationServiceType {
  return {
    toExpression: (annotation) => {
      if (isRangeAnnotation(annotation)) {
        const { label, isHidden, color, key, outside } = annotation;
        const { timestamp: time, endTimestamp: endTime } = key;
        return {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'manual_range_event_annotation',
              arguments: {
                time: [time],
                endTime: [endTime],
                label: [label || defaultAnnotationLabel],
                color: [color || defaultAnnotationColor],
                outside: [Boolean(outside)],
                isHidden: [Boolean(isHidden)],
              },
            },
          ],
        };
      } else {
        const { label, isHidden, color, lineStyle, lineWidth, icon, key, textVisibility } =
          annotation;
        return {
          type: 'expression',
          chain: [
            {
              type: 'function',
              function: 'manual_point_event_annotation',
              arguments: {
                time: [key.timestamp],
                label: [label || defaultAnnotationLabel],
                color: [color || defaultAnnotationColor],
                lineWidth: [lineWidth || 1],
                lineStyle: [lineStyle || 'solid'],
                icon: hasIcon(icon) ? [icon] : ['triangle'],
                textVisibility: [textVisibility || false],
                isHidden: [Boolean(isHidden)],
              },
            },
          ],
        };
      }
    },
  };
}

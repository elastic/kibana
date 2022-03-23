/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventAnnotationServiceType } from './types';
import { defaultAnnotationColor } from './helpers';

export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

export function getEventAnnotationService(): EventAnnotationServiceType {
  return {
    toExpression: ({
      label,
      isHidden,
      color,
      lineStyle,
      lineWidth,
      icon,
      textVisibility,
      time,
    }) => {
      return {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'manual_event_annotation',
            arguments: {
              time: [time],
              label: [label],
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
    },
  };
}

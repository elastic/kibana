/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-ignore
import chroma from 'chroma-js';

import { EventAnnotationServiceType } from './types';
import { defaultAnnotationColor } from '..';

export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

export function getAnnotationService(): EventAnnotationServiceType {
  return {
    toExpression: ({
      label,
      isHidden,
      id,
      color,
      lineStyle,
      lineWidth,
      icon,
      iconPosition,
      textVisibility,
      key,
    }) => {
      return {
        type: 'expression',
        chain: [
          {
            type: 'function',
            function: 'annotation_config',
            arguments: {
              annotationType: ['manual'],
              key: [
                {
                  type: 'expression',
                  chain: [
                    {
                      type: 'function',
                      function: 'annotation_key',
                      arguments: {
                        keyType: ['point_in_time'],
                        timestamp: [key.timestamp],
                      },
                    },
                  ],
                },
              ],
              label: [label],
              color: [color || defaultAnnotationColor],
              lineWidth: [lineWidth || 1],
              lineStyle: [lineStyle || 'solid'],
              id: [id],
              icon: hasIcon(icon) ? [icon] : ['empty'],
              iconPosition: hasIcon(icon) || textVisibility ? [iconPosition || 'auto'] : ['auto'],
              textVisibility: [textVisibility || false],
              isHidden: [Boolean(isHidden)],
              axisMode: ['bottom'],
            },
          },
        ],
      };
    },
  };
}

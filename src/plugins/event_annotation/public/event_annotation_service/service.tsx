/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { partition } from 'lodash';
import { queryToAst } from '@kbn/data-plugin/common';
import { EventAnnotationServiceType } from './types';
import {
  defaultAnnotationColor,
  defaultAnnotationRangeColor,
  defaultAnnotationLabel,
  isRangeAnnotationConfig,
  isQueryAnnotationConfig,
} from './helpers';

export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

export function getEventAnnotationService(): EventAnnotationServiceType {
  return {
    toExpression: (annotations) => {
      const visibleAnnotations = annotations.filter(({ isHidden }) => !isHidden);
      const [queryBasedAnnotations, manualBasedAnnotations] = partition(
        visibleAnnotations,
        isQueryAnnotationConfig
      );

      const expressions = [];

      for (const annotation of manualBasedAnnotations) {
        if (isRangeAnnotationConfig(annotation)) {
          const { label, isHidden, color, key, outside, id } = annotation;
          const { timestamp: time, endTimestamp: endTime } = key;
          expressions.push({
            type: 'expression' as const,
            chain: [
              {
                type: 'function' as const,
                function: 'manual_range_event_annotation',
                arguments: {
                  id: [id],
                  time: [time],
                  endTime: [endTime],
                  label: [label || defaultAnnotationLabel],
                  color: [color || defaultAnnotationRangeColor],
                  outside: [Boolean(outside)],
                  isHidden: [Boolean(isHidden)],
                },
              },
            ],
          });
        } else {
          const { label, isHidden, color, lineStyle, lineWidth, icon, key, textVisibility, id } =
            annotation;
          expressions.push({
            type: 'expression' as const,
            chain: [
              {
                type: 'function' as const,
                function: 'manual_point_event_annotation',
                arguments: {
                  id: [id],
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
          });
        }
      }

      for (const annotation of queryBasedAnnotations) {
        const {
          id,
          label,
          isHidden,
          color,
          lineStyle,
          lineWidth,
          icon,
          timeField,
          textVisibility,
          textField,
          filter,
          extraFields,
        } = annotation;
        expressions.push({
          type: 'expression' as const,
          chain: [
            {
              type: 'function' as const,
              function: 'query_point_event_annotation',
              arguments: {
                id: [id],
                timeField: [timeField],
                label: [label || defaultAnnotationLabel],
                color: [color || defaultAnnotationColor],
                lineWidth: [lineWidth || 1],
                lineStyle: [lineStyle || 'solid'],
                icon: hasIcon(icon) ? [icon] : ['triangle'],
                textVisibility: [textVisibility || false],
                textField: textVisibility && textField ? [textField] : [],
                isHidden: [Boolean(isHidden)],
                filter: filter ? [queryToAst(filter)] : [],
                extraFields: extraFields || [],
              },
            },
          ],
        });
      }
      return expressions;
    },
  };
}

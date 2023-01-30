/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { partition } from 'lodash';
import { queryToAst } from '@kbn/data-plugin/common';
import { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import { EventAnnotationConfig } from '../../common';
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
  const annotationsToExpression = (annotations: EventAnnotationConfig[]) => {
    const [queryBasedAnnotations, manualBasedAnnotations] = partition(
      annotations,
      isQueryAnnotationConfig
    );

    const expressions = [];

    for (const annotation of manualBasedAnnotations) {
      if (isRangeAnnotationConfig(annotation)) {
        const { label, color, key, outside, id } = annotation;
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
                isHidden: [Boolean(annotation.isHidden)],
              },
            },
          ],
        });
      } else {
        const { label, color, lineStyle, lineWidth, icon, key, textVisibility, id } = annotation;
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
                isHidden: [Boolean(annotation.isHidden)],
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
              timeField: timeField ? [timeField] : [],
              label: [label || defaultAnnotationLabel],
              color: [color || defaultAnnotationColor],
              lineWidth: [lineWidth || 1],
              lineStyle: [lineStyle || 'solid'],
              icon: hasIcon(icon) ? [icon] : ['triangle'],
              textVisibility: [textVisibility || false],
              textField: textVisibility && textField ? [textField] : [],
              filter: filter ? [queryToAst(filter)] : [],
              extraFields: extraFields || [],
              isHidden: [Boolean(annotation.isHidden)],
            },
          },
        ],
      });
    }
    return expressions;
  };
  return {
    toExpression: annotationsToExpression,
    toFetchExpression: ({ interval, groups }) => {
      if (groups.length === 0) {
        return [];
      }

      const groupsExpressions = groups
        .filter((g) => g.annotations.some((a) => !a.isHidden))
        .map(({ annotations, indexPatternId, ignoreGlobalFilters }): ExpressionAstExpression => {
          const indexPatternExpression: ExpressionAstExpression = {
            type: 'expression',
            chain: [
              {
                type: 'function',
                function: 'indexPatternLoad',
                arguments: {
                  id: [indexPatternId],
                },
              },
            ],
          };
          const annotationExpressions = annotationsToExpression(annotations);
          return {
            type: 'expression',
            chain: [
              {
                type: 'function',
                function: 'event_annotation_group',
                arguments: {
                  dataView: [indexPatternExpression],
                  annotations: [...annotationExpressions],
                  ignoreGlobalFilters: [Boolean(ignoreGlobalFilters)],
                },
              },
            ],
          };
        });

      const fetchExpression: ExpressionAstExpression = {
        type: 'expression',
        chain: [
          { type: 'function', function: 'kibana', arguments: {} },
          {
            type: 'function',
            function: 'fetch_event_annotations',
            arguments: {
              interval: [interval],
              groups: [...groupsExpressions],
            },
          },
        ],
      };

      return [fetchExpression];
    },
  };
}

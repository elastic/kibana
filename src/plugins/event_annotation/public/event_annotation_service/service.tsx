/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { partition } from 'lodash';
import { queryToAst } from '@kbn/data-plugin/common';
import { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import { CoreStart, SavedObjectsClientContract } from '@kbn/core/public';
import { SavedObjectCommon } from '@kbn/saved-objects-plugin/common';
import {
  EventAnnotationConfig,
  EventAnnotationGroupConfig,
  EVENT_ANNOTATION_GROUP_TYPE,
} from '../../common';
import { EventAnnotationServiceType } from './types';
import {
  defaultAnnotationColor,
  defaultAnnotationRangeColor,
  defaultAnnotationLabel,
  isRangeAnnotationConfig,
  isQueryAnnotationConfig,
} from './helpers';
import { EventAnnotationGroupSavedObjectFinder } from '../components/event_annotation_group_saved_object_finder';

export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

export function getEventAnnotationService(core: CoreStart): EventAnnotationServiceType {
  const client: SavedObjectsClientContract = core.savedObjects.client;

  // const loadAnnotationGroup = async (
  //   savedObjectId: string
  // ): Promise<EventAnnotationGroupConfig> => {
  //   const groupResponse = await client.resolve<EventAnnotationGroupAttributes>(
  //     EVENT_ANNOTATION_GROUP_TYPE,
  //     savedObjectId
  //   );

  //   if (groupResponse.saved_object.error) {
  //     throw groupResponse.saved_object.error;
  //   }

  //   const annotations = (
  //     await client.find<EventAnnotationConfig>({
  //       type: EVENT_ANNOTATION_TYPE,
  //       hasReference: {
  //         type: EVENT_ANNOTATION_GROUP_TYPE,
  //         id: savedObjectId,
  //       },
  //     })
  //   ).savedObjects
  //     .filter(({ error }) => !error)
  //     .map((annotation) => annotation.attributes);

  //   return {
  //     title: groupResponse.saved_object.attributes.title,
  //     description: groupResponse.saved_object.attributes.description,
  //     tags: groupResponse.saved_object.attributes.tags,
  //     ignoreGlobalFilters: groupResponse.saved_object.attributes.ignoreGlobalFilters,
  //     indexPatternId: groupResponse.saved_object.references.find(
  //       (ref) => ref.type === 'index-pattern'
  //     )?.id!,
  //     annotations,
  //   };
  // };

  // const deleteAnnotationGroup = async (savedObjectId: string): Promise<void> => {
  //   const annotationsSOs = (
  //     await client.find({
  //       type: EVENT_ANNOTATION_TYPE,
  //       hasReference: {
  //         type: EVENT_ANNOTATION_GROUP_TYPE,
  //         id: savedObjectId,
  //       },
  //     })
  //   ).savedObjects.map((annotation) => ({ id: annotation.id, type: EVENT_ANNOTATION_TYPE }));
  //   await client.bulkDelete([
  //     { type: EVENT_ANNOTATION_GROUP_TYPE, id: savedObjectId },
  //     ...annotationsSOs,
  //   ]);
  // };

  const createAnnotationGroup = async (
    group: EventAnnotationGroupConfig
  ): Promise<{ id: string }> => {
    const { title, ignoreGlobalFilters, indexPatternId, annotations } = group;

    const groupSavedObjectId = (
      await client.create(
        EVENT_ANNOTATION_GROUP_TYPE,
        { title, ignoreGlobalFilters, annotations },
        {
          references: [
            {
              type: 'index-pattern',
              id: indexPatternId,
              name: `event-annotation-group_dataView-ref-${indexPatternId}`,
            },
          ],
        }
      )
    ).id;

    return { id: groupSavedObjectId };
  };

  // const updateAnnotationGroup = async (
  //   group: EventAnnotationGroupConfig,
  //   savedObjectId: string
  // ): Promise<void> => {
  //   const { title, description, tags, ignoreGlobalFilters, indexPatternId } = group;
  //   await client.update(
  //     EVENT_ANNOTATION_GROUP_TYPE,
  //     savedObjectId,
  //     { title, description, tags, ignoreGlobalFilters },
  //     {
  //       references: [
  //         {
  //           type: 'index-pattern',
  //           id: indexPatternId,
  //           name: `event-annotation-group_dataView-ref-${indexPatternId}`,
  //         },
  //       ],
  //     }
  //   );
  // };

  // const updateAnnotations = async (
  //   savedObjectId: string,
  //   modifications: { delete?: string[]; upsert?: EventAnnotationConfig[] }
  // ): Promise<void> => {
  //   if (modifications.delete && modifications.delete.length > 0) {
  //     await client.bulkDelete(
  //       modifications.delete.map((id) => ({ type: EVENT_ANNOTATION_TYPE, id }))
  //     );
  //   }

  //   if (modifications.upsert && modifications.upsert.length > 0) {
  //     const annotationsToUpdate = modifications.upsert.map((a) => ({
  //       type: EVENT_ANNOTATION_TYPE,
  //       attributes: a,
  //       id: a.id,
  //       overwrite: true,
  //       references: [
  //         {
  //           type: EVENT_ANNOTATION_GROUP_TYPE,
  //           id: savedObjectId,
  //           name: `event-annotation-group-ref-${a.id}`,
  //         },
  //       ],
  //     }));
  //     await client.bulkCreate(annotationsToUpdate);
  //   }
  // };

  return {
    // loadAnnotationGroup,
    // updateAnnotations,
    // updateAnnotationGroup,
    createAnnotationGroup,
    // deleteAnnotationGroup,
    renderEventAnnotationGroupSavedObjectFinder: (props: {
      fixedPageSize: number;
      onChoose: (value: {
        id: string;
        type: string;
        fullName: string;
        savedObject: SavedObjectCommon<unknown>;
      }) => void;
    }) => {
      return (
        <EventAnnotationGroupSavedObjectFinder
          http={core.http}
          uiSettings={core.uiSettings}
          {...props}
        />
      );
    },
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

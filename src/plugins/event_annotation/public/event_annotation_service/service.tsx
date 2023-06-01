/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { partition } from 'lodash';
import { queryToAst } from '@kbn/data-common';
import { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import { CoreStart, SavedObjectReference, SavedObjectsClientContract } from '@kbn/core/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { DataViewPersistableStateService } from '@kbn/data-views-plugin/common';
import {
  EventAnnotationConfig,
  EventAnnotationGroupAttributes,
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

export function getEventAnnotationService(
  core: CoreStart,
  savedObjectsManagement: SavedObjectsManagementPluginStart
): EventAnnotationServiceType {
  const client: SavedObjectsClientContract = core.savedObjects.client;

  const loadAnnotationGroup = async (
    savedObjectId: string
  ): Promise<EventAnnotationGroupConfig> => {
    const savedObject = await client.get<EventAnnotationGroupAttributes>(
      EVENT_ANNOTATION_GROUP_TYPE,
      savedObjectId
    );

    if (savedObject.error) {
      throw savedObject.error;
    }

    const adHocDataViewSpec = savedObject.attributes.dataViewSpec
      ? DataViewPersistableStateService.inject(
          savedObject.attributes.dataViewSpec,
          savedObject.references
        )
      : undefined;

    return {
      title: savedObject.attributes.title,
      description: savedObject.attributes.description,
      tags: savedObject.attributes.tags,
      ignoreGlobalFilters: savedObject.attributes.ignoreGlobalFilters,
      indexPatternId: adHocDataViewSpec
        ? adHocDataViewSpec.id!
        : savedObject.references.find((ref) => ref.type === 'index-pattern')?.id!,
      annotations: savedObject.attributes.annotations,
      dataViewSpec: adHocDataViewSpec,
    };
  };

  const extractDataViewInformation = (group: EventAnnotationGroupConfig) => {
    let { dataViewSpec = null } = group;

    let references: SavedObjectReference[];

    if (dataViewSpec) {
      if (!dataViewSpec.id)
        throw new Error(
          'tried to create annotation group with a data view spec that did not include an ID!'
        );

      const { state, references: refsFromDataView } =
        DataViewPersistableStateService.extract(dataViewSpec);
      dataViewSpec = state;
      references = refsFromDataView;
    } else {
      references = [
        {
          type: 'index-pattern',
          id: group.indexPatternId,
          name: `event-annotation-group_dataView-ref-${group.indexPatternId}`,
        },
      ];
    }

    return { references, dataViewSpec };
  };

  const createAnnotationGroup = async (
    group: EventAnnotationGroupConfig
  ): Promise<{ id: string }> => {
    const { references, dataViewSpec } = extractDataViewInformation(group);
    const { title, description, tags, ignoreGlobalFilters, annotations } = group;

    const groupSavedObjectId = (
      await client.create(
        EVENT_ANNOTATION_GROUP_TYPE,
        { title, description, tags, ignoreGlobalFilters, annotations, dataViewSpec },
        {
          references,
        }
      )
    ).id;

    return { id: groupSavedObjectId };
  };

  const updateAnnotationGroup = async (
    group: EventAnnotationGroupConfig,
    annotationGroupId: string
  ): Promise<void> => {
    const { references, dataViewSpec } = extractDataViewInformation(group);
    const { title, description, tags, ignoreGlobalFilters, annotations } = group;

    await client.update(
      EVENT_ANNOTATION_GROUP_TYPE,
      annotationGroupId,
      { title, description, tags, ignoreGlobalFilters, annotations, dataViewSpec },
      {
        references,
      }
    );
  };

  const checkHasAnnotationGroups = async (): Promise<boolean> => {
    const response = await client.find({
      type: EVENT_ANNOTATION_GROUP_TYPE,
      perPage: 0,
    });

    return response.total > 0;
  };

  return {
    loadAnnotationGroup,
    updateAnnotationGroup,
    createAnnotationGroup,
    renderEventAnnotationGroupSavedObjectFinder: (props) => {
      return (
        <EventAnnotationGroupSavedObjectFinder
          http={core.http}
          uiSettings={core.uiSettings}
          savedObjectsManagement={savedObjectsManagement}
          checkHasAnnotationGroups={checkHasAnnotationGroups}
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

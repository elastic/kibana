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
import type { CoreStart, SavedObjectReference } from '@kbn/core/public';
import { DataViewPersistableStateService } from '@kbn/data-views-plugin/common';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { type EventAnnotationServiceType } from '@kbn/event-annotation-components';
import {
  defaultAnnotationColor,
  defaultAnnotationRangeColor,
  isRangeAnnotationConfig,
  isQueryAnnotationConfig,
  defaultAnnotationLabel,
  type EventAnnotationGroupContent,
  type EventAnnotationConfig,
  type EventAnnotationGroupConfig,
} from '@kbn/event-annotation-common';
import { EventAnnotationGroupSavedObjectFinder } from '../components/event_annotation_group_saved_object_finder';
import { CONTENT_ID } from '../../common/content_management';
import type {
  EventAnnotationGroupCreateIn,
  EventAnnotationGroupCreateOut,
  EventAnnotationGroupDeleteIn,
  EventAnnotationGroupDeleteOut,
  EventAnnotationGroupGetIn,
  EventAnnotationGroupGetOut,
  EventAnnotationGroupSavedObject,
  EventAnnotationGroupSavedObjectAttributes,
  EventAnnotationGroupSearchIn,
  EventAnnotationGroupSearchOut,
  EventAnnotationGroupUpdateIn,
  EventAnnotationGroupUpdateOut,
} from '../../common/content_management';

export function hasIcon(icon: string | undefined): icon is string {
  return icon != null && icon !== 'empty';
}

export function getEventAnnotationService(
  core: CoreStart,
  contentManagement: ContentManagementPublicStart
): EventAnnotationServiceType {
  const client = contentManagement.client;

  const mapSavedObjectToGroupConfig = (
    savedObject: EventAnnotationGroupSavedObject
  ): EventAnnotationGroupConfig => {
    const adHocDataViewSpec = savedObject.attributes.dataViewSpec
      ? DataViewPersistableStateService.inject(
          savedObject.attributes.dataViewSpec,
          savedObject.references
        )
      : undefined;

    return {
      title: savedObject.attributes.title,
      description: savedObject.attributes.description,
      tags: savedObject.references.filter((ref) => ref.type === 'tag').map(({ id }) => id),
      ignoreGlobalFilters: savedObject.attributes.ignoreGlobalFilters,
      indexPatternId: adHocDataViewSpec
        ? adHocDataViewSpec.id!
        : savedObject.references.find((ref) => ref.type === 'index-pattern')?.id!,
      annotations: savedObject.attributes.annotations,
      dataViewSpec: adHocDataViewSpec,
    };
  };

  const mapSavedObjectToGroupContent = (
    savedObject: EventAnnotationGroupSavedObject
  ): EventAnnotationGroupContent => {
    const groupConfig = mapSavedObjectToGroupConfig(savedObject);

    return {
      id: savedObject.id,
      references: savedObject.references,
      type: savedObject.type,
      updatedAt: savedObject.updatedAt ? savedObject.updatedAt : '',
      attributes: {
        title: groupConfig.title,
        description: groupConfig.description,
        indexPatternId: groupConfig.indexPatternId,
        dataViewSpec: groupConfig.dataViewSpec,
      },
    };
  };

  const loadAnnotationGroup = async (
    savedObjectId: string
  ): Promise<EventAnnotationGroupConfig> => {
    const savedObject = await client.get<EventAnnotationGroupGetIn, EventAnnotationGroupGetOut>({
      contentTypeId: CONTENT_ID,
      id: savedObjectId,
    });

    if (savedObject.item.error) {
      throw savedObject.item.error;
    }

    return mapSavedObjectToGroupConfig(savedObject.item);
  };

  const groupExistsWithTitle = async (title: string): Promise<boolean> => {
    const { hits } = await client.search<
      EventAnnotationGroupSearchIn,
      EventAnnotationGroupSearchOut
    >({
      contentTypeId: CONTENT_ID,
      query: {
        text: title,
      },
      options: {
        searchFields: ['title'],
      },
    });

    for (const hit of hits) {
      if (hit.attributes.title.toLowerCase() === title.toLowerCase()) {
        return true;
      }
    }

    return false;
  };

  const findAnnotationGroupContent = async (
    searchTerm: string,
    pageSize: number,
    tagsToInclude?: string[],
    tagsToExclude?: string[]
  ): Promise<{ total: number; hits: EventAnnotationGroupContent[] }> => {
    const { pagination, hits } = await client.search<
      EventAnnotationGroupSearchIn,
      EventAnnotationGroupSearchOut
    >({
      contentTypeId: CONTENT_ID,
      query: {
        text: searchTerm ? `${searchTerm}*` : undefined,
        limit: pageSize,
        tags: {
          included: tagsToInclude,
          excluded: tagsToExclude,
        },
      },
    });

    return {
      total: pagination.total,
      hits: hits.map(mapSavedObjectToGroupContent),
    };
  };

  const deleteAnnotationGroups = async (ids: string[]): Promise<void> => {
    for (const id of ids) {
      await client.delete<EventAnnotationGroupDeleteIn, EventAnnotationGroupDeleteOut>({
        contentTypeId: CONTENT_ID,
        id,
      });
    }
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

  const getAnnotationGroupAttributesAndReferences = (
    group: EventAnnotationGroupConfig
  ): {
    attributes: EventAnnotationGroupSavedObjectAttributes;
    references: SavedObjectReference[];
  } => {
    const { references, dataViewSpec } = extractDataViewInformation(group);
    const { title, description, tags, ignoreGlobalFilters, annotations } = group;

    references.push(
      ...tags.map((tag) => ({
        id: tag,
        name: tag,
        type: 'tag',
      }))
    );

    return {
      attributes: {
        title,
        description,
        ignoreGlobalFilters,
        annotations,
        dataViewSpec,
      },
      references,
    };
  };

  const createAnnotationGroup = async (
    group: EventAnnotationGroupConfig
  ): Promise<{ id: string }> => {
    const { attributes, references } = getAnnotationGroupAttributesAndReferences(group);

    const groupSavedObjectId = (
      await client.create<EventAnnotationGroupCreateIn, EventAnnotationGroupCreateOut>({
        contentTypeId: CONTENT_ID,
        data: {
          ...attributes,
        },
        options: {
          references,
        },
      })
    ).item.id;

    return { id: groupSavedObjectId };
  };

  const updateAnnotationGroup = async (
    group: EventAnnotationGroupConfig,
    annotationGroupId: string
  ): Promise<void> => {
    const { attributes, references } = getAnnotationGroupAttributesAndReferences(group);

    await client.update<EventAnnotationGroupUpdateIn, EventAnnotationGroupUpdateOut>({
      contentTypeId: CONTENT_ID,
      id: annotationGroupId,
      data: {
        ...attributes,
      },
      options: {
        references,
      },
    });
  };

  const checkHasAnnotationGroups = async (): Promise<boolean> => {
    const response = await client.search<
      EventAnnotationGroupSearchIn,
      EventAnnotationGroupSearchOut
    >({
      contentTypeId: CONTENT_ID,
      query: {
        text: '*',
      },
    });

    return response.pagination.total > 0;
  };

  return {
    loadAnnotationGroup,
    groupExistsWithTitle,
    updateAnnotationGroup,
    createAnnotationGroup,
    deleteAnnotationGroups,
    findAnnotationGroupContent,
    renderEventAnnotationGroupSavedObjectFinder: (props) => {
      return (
        <EventAnnotationGroupSavedObjectFinder
          contentClient={contentManagement.client}
          uiSettings={core.uiSettings}
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

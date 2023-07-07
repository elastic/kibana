/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from 'utility-types';
import { DataViewSpec, KibanaQueryOutput } from '@kbn/data-plugin/common';
import { UserContentCommonSchema } from '@kbn/content-management-table-list-view-table';
import { LineStyle } from '@kbn/visualization-ui-components';
import { SavedObjectsFindOptionsReference } from '@kbn/core-saved-objects-api-server';
import { ExpressionAstExpression } from '@kbn/expressions-plugin/common';
import { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { AvailableAnnotationIcons } from './constants';

export type AvailableAnnotationIcon = $Values<typeof AvailableAnnotationIcons>;

export type PointStyleProps = StyleSharedProps & {
  icon?: AvailableAnnotationIcon;
  lineWidth?: number;
  lineStyle?: LineStyle;
  textVisibility?: boolean;
};

export type PointInTimeEventAnnotationConfig = {
  id: string;
  type: ManualAnnotationType;
  key: {
    type: 'point_in_time';
    timestamp: string;
  };
} & PointStyleProps;

export type Fill = 'inside' | 'outside' | 'none';
export type ManualAnnotationType = 'manual';
export type QueryAnnotationType = 'query';
export type KeyType = 'point_in_time' | 'range';

interface StyleSharedProps {
  label: string;
  color?: string;
  isHidden?: boolean;
}

export type RangeStyleProps = StyleSharedProps & {
  outside?: boolean;
};

export type RangeEventAnnotationConfig = {
  type: ManualAnnotationType;
  id: string;
  key: {
    type: 'range';
    timestamp: string;
    endTimestamp: string;
  };
} & RangeStyleProps;

export type StyleProps = PointStyleProps & RangeStyleProps;

export type QueryPointEventAnnotationConfig = {
  id: string;
  type: QueryAnnotationType;
  filter: KibanaQueryOutput;
  timeField?: string;
  textField?: string;
  extraFields?: string[];
  key: {
    type: 'point_in_time';
  };
} & PointStyleProps;

export type EventAnnotationConfig =
  | PointInTimeEventAnnotationConfig
  | RangeEventAnnotationConfig
  | QueryPointEventAnnotationConfig;

export interface EventAnnotationGroupConfig {
  annotations: EventAnnotationConfig[];
  indexPatternId: string;
  ignoreGlobalFilters: boolean;
  title: string;
  description: string;
  tags: string[];
  dataViewSpec?: DataViewSpec;
}

export type EventAnnotationGroupContent = UserContentCommonSchema & {
  attributes: { indexPatternId: string; dataViewSpec?: DataViewSpec };
};

export interface EventAnnotationServiceType {
  loadAnnotationGroup: (savedObjectId: string) => Promise<EventAnnotationGroupConfig>;
  groupExistsWithTitle: (title: string) => Promise<boolean>;
  findAnnotationGroupContent: (
    searchTerm: string,
    pageSize: number,
    references?: SavedObjectsFindOptionsReference[],
    referencesToExclude?: SavedObjectsFindOptionsReference[]
  ) => Promise<{ total: number; hits: EventAnnotationGroupContent[] }>;
  deleteAnnotationGroups: (ids: string[]) => Promise<void>;
  createAnnotationGroup: (group: EventAnnotationGroupConfig) => Promise<{ id: string }>;
  updateAnnotationGroup: (
    group: EventAnnotationGroupConfig,
    savedObjectId: string
  ) => Promise<void>;
  toExpression: (props: EventAnnotationConfig[]) => ExpressionAstExpression[];
  toFetchExpression: (props: {
    interval: string;
    groups: Array<
      Pick<EventAnnotationGroupConfig, 'annotations' | 'ignoreGlobalFilters' | 'indexPatternId'>
    >;
  }) => ExpressionAstExpression[];
  renderEventAnnotationGroupSavedObjectFinder: (props: {
    fixedPageSize?: number;
    onChoose: (value: {
      id: string;
      type: string;
      fullName: string;
      savedObject: SavedObjectCommon<unknown>;
    }) => void;
    onCreateNew: () => void;
  }) => JSX.Element;
}

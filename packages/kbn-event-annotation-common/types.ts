/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { $Values } from 'utility-types';
import { DataViewSpec, KibanaQueryOutput } from '@kbn/data-plugin/common';
import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';
import type { LineStyle } from '@kbn/visualization-ui-components';
import { AvailableAnnotationIcons } from '.';

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

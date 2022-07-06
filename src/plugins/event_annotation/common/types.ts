/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Query } from '@kbn/es-query';
import { $Values } from '@kbn/utility-types';
import { AvailableAnnotationIcons } from './constants';
import {
  ManualPointEventAnnotationArgs,
  ManualRangeEventAnnotationArgs,
  ManualPointEventAnnotationOutput,
  ManualRangeEventAnnotationOutput,
} from './manual_event_annotation/types';
import { QueryPointEventAnnotationOutput } from './query_event_annotation/types';

export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type Fill = 'inside' | 'outside' | 'none';
export type ManualAnnotationType = 'manual';
export type QueryAnnotationType = 'query';
export type KeyType = 'point_in_time' | 'range';
export type AvailableAnnotationIcon = $Values<typeof AvailableAnnotationIcons>;

export type EventAnnotationArgs =
  | ManualPointEventAnnotationArgs
  | ManualRangeEventAnnotationArgs
  | QueryPointEventAnnotationOutput;
export type EventAnnotationOutput =
  | ManualPointEventAnnotationOutput
  | ManualRangeEventAnnotationOutput
  | QueryPointEventAnnotationOutput;

interface StyleSharedProps {
  label: string;
  color?: string;
  isHidden?: boolean;
}

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

export type PointInTimeQueryEventAnnotationConfig = {
  id: string;
  type: QueryAnnotationType;
  key: {
    type: 'point_in_time';
    field: string;
  };
  additionalFields?: string[];
  query: Query;
  textSource?: 'name' | 'field';
} & PointStyleProps;

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

export type EventAnnotationConfig =
  | PointInTimeEventAnnotationConfig
  | RangeEventAnnotationConfig
  | PointInTimeQueryEventAnnotationConfig;

export type PointInTimeAnnotationTypes =
  | PointInTimeEventAnnotationConfig
  | PointInTimeQueryEventAnnotationConfig;

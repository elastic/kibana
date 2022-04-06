/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type Fill = 'inside' | 'outside' | 'none';
export type AnnotationType = 'manual';
export type KeyType = 'point_in_time' | 'range';

export interface PointStyleProps {
  label: string;
  color?: string;
  icon?: string;
  lineWidth?: number;
  lineStyle?: LineStyle;
  textVisibility?: boolean;
  isHidden?: boolean;
}

export type PointInTimeEventAnnotationConfig = {
  id: string;
  key: {
    type: 'point_in_time';
    timestamp: string;
  };
} & PointStyleProps;

export interface RangeStyleProps {
  label: string;
  color?: string;
  outside?: boolean;
  textVisibility?: boolean;
  isHidden?: boolean;
}

export type RangeEventAnnotationConfig = {
  id: string;
  key: {
    type: 'range';
    timestamp: string;
    endTimestamp: string;
  };
} & RangeStyleProps;

export type StyleProps = PointStyleProps & RangeStyleProps;

export type EventAnnotationConfig = PointInTimeEventAnnotationConfig | RangeEventAnnotationConfig;

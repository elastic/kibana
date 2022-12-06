/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PointStyleProps, RangeStyleProps } from '../types';

export type ManualPointEventAnnotationArgs = {
  id: string;
  time: string;
} & PointStyleProps;

export type ManualPointEventAnnotationOutput = ManualPointEventAnnotationArgs & {
  type: 'manual_point_event_annotation';
};

export type PointEventAnnotationRow = {
  id: string;
  time: string;
  type: 'point';
  timebucket: string;
  skippedCount?: number;
} & PointStyleProps &
  Record<string, any>;

export type ManualRangeEventAnnotationArgs = {
  id: string;
  time: string;
  endTime: string;
} & RangeStyleProps;

export type ManualRangeEventAnnotationRow = {
  id: string;
  time: string;
  endTime: string;
  type: 'range';
} & RangeStyleProps;

export type ManualRangeEventAnnotationOutput = ManualRangeEventAnnotationArgs & {
  type: 'manual_range_event_annotation';
};

export type ManualEventAnnotationOutput =
  | ManualPointEventAnnotationOutput
  | ManualRangeEventAnnotationOutput;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PointStyleProps, RangeStyleProps } from '../types';

export type ManualPointEventAnnotationArgs = {
  time: string;
} & PointStyleProps;

export type ManualPointEventAnnotationOutput = ManualPointEventAnnotationArgs & {
  type: 'manual_point_event_annotation';
};

export type ManualRangeEventAnnotationArgs = {
  time: string;
  endTime: string;
} & RangeStyleProps;

export type ManualRangeEventAnnotationOutput = ManualRangeEventAnnotationArgs & {
  type: 'manual_range_event_annotation';
};

export type EventAnnotationArgs = ManualPointEventAnnotationArgs | ManualRangeEventAnnotationArgs;
export type EventAnnotationOutput =
  | ManualPointEventAnnotationOutput
  | ManualRangeEventAnnotationOutput;

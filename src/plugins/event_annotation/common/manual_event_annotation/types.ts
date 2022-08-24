/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DatatableColumn } from '@kbn/expressions-plugin/common';
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

export const annotationColumns: DatatableColumn[] = [
  { id: 'time', name: 'time', meta: { type: 'string' } },
  { id: 'endTime', name: 'endTime', meta: { type: 'string' } },
  { id: 'timebucket', name: 'timebucket', meta: { type: 'string' } },
  { id: 'type', name: 'type', meta: { type: 'string' } },
  { id: 'label', name: 'label', meta: { type: 'string' } },
  { id: 'color', name: 'color', meta: { type: 'string' } },
  { id: 'lineStyle', name: 'lineStyle', meta: { type: 'string' } },
  { id: 'lineWidth', name: 'lineWidth', meta: { type: 'number' } },
  { id: 'icon', name: 'icon', meta: { type: 'string' } },
  { id: 'textVisibility', name: 'textVisibility', meta: { type: 'boolean' } },
  { id: 'outside', name: 'outside', meta: { type: 'number' } },
  { id: 'skippedAnnotationsCount', name: 'skippedAnnotationsCount', meta: { type: 'number' } },
];

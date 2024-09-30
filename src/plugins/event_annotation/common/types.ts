/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DatatableColumn } from '@kbn/expressions-plugin/common';
import {
  ManualEventAnnotationOutput,
  ManualPointEventAnnotationArgs,
  ManualRangeEventAnnotationArgs,
} from './manual_event_annotation/types';
import {
  QueryPointEventAnnotationArgs,
  QueryPointEventAnnotationOutput,
} from './query_point_event_annotation/types';

export type Fill = 'inside' | 'outside' | 'none';
export type ManualAnnotationType = 'manual';
export type QueryAnnotationType = 'query';
export type KeyType = 'point_in_time' | 'range';

export type EventAnnotationArgs =
  | ManualPointEventAnnotationArgs
  | ManualRangeEventAnnotationArgs
  | QueryPointEventAnnotationArgs;

export type EventAnnotationOutput = ManualEventAnnotationOutput | QueryPointEventAnnotationOutput;

export const annotationColumns: DatatableColumn[] = [
  { id: 'id', name: 'id', meta: { type: 'string' } },
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
  { id: 'textField', name: 'textField', meta: { type: 'string' } },
  { id: 'outside', name: 'outside', meta: { type: 'number' } },
  { id: 'type', name: 'type', meta: { type: 'string' } },
  { id: 'skippedCount', name: 'skippedCount', meta: { type: 'number' } },
];

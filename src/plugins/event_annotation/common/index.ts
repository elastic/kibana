/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type {
  EventAnnotationArgs,
  EventAnnotationOutput,
  ManualPointEventAnnotationArgs,
  ManualPointEventAnnotationOutput,
  ManualRangeEventAnnotationArgs,
  ManualRangeEventAnnotationOutput,
} from './manual_event_annotation/types';
export { manualPointEventAnnotation, manualRangeEventAnnotation } from './manual_event_annotation';
export { eventAnnotationGroup } from './event_annotation_group';
export type { EventAnnotationGroupArgs } from './event_annotation_group';
export { fetchEventAnnotations } from './fetch_event_annotations';
export type { FetchEventAnnotationsArgs } from './fetch_event_annotations';
export type {
  EventAnnotationConfig,
  RangeEventAnnotationConfig,
  AvailableAnnotationIcon,
} from './types';

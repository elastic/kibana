/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const AvailableAnnotationIcons = {
  ASTERISK: 'asterisk',
  ALERT: 'warning',
  BELL: 'bell',
  BOLT: 'bolt',
  BUG: 'bug',
  CIRCLE: 'circle',
  EDITOR_COMMENT: 'comment',
  FLAG: 'flag',
  HEART: 'heart',
  MAP_MARKER: 'waypoint',
  PIN_FILLED: 'pinFill',
  STAR_EMPTY: 'star',
  STAR_FILLED: 'starFill',
  TAG: 'tag',
  TRIANGLE: 'triangle',
} as const;

export const EVENT_ANNOTATION_GROUP_TYPE = 'event-annotation-group';

export {
  defaultAnnotationColor,
  defaultAnnotationRangeColor,
  defaultAnnotationLabel,
  defaultRangeAnnotationLabel,
  getDefaultManualAnnotation,
  getDefaultQueryAnnotation,
  createCopiedAnnotation,
  isRangeAnnotationConfig,
  isManualPointAnnotationConfig,
  isQueryAnnotationConfig,
} from './util';

export type {
  EventAnnotationGroupContent,
  AvailableAnnotationIcon,
  PointStyleProps,
  EventAnnotationConfig,
  EventAnnotationGroupConfig,
  RangeStyleProps,
  ManualAnnotationType,
  PointInTimeEventAnnotationConfig,
  RangeEventAnnotationConfig,
  QueryPointEventAnnotationConfig,
} from './types';

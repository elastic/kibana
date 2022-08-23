/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange } from '@kbn/data-plugin/common';

import {
  EventAnnotationOutput,
  ManualPointEventAnnotationOutput,
  ManualRangeEventAnnotationOutput,
} from '../manual_event_annotation/types';

export const isRangeAnnotation = (
  annotation: EventAnnotationOutput
): annotation is ManualRangeEventAnnotationOutput => {
  return 'endTime' in annotation;
};

export const isManualPointAnnotation = (
  annotation: EventAnnotationOutput
): annotation is ManualPointEventAnnotationOutput => {
  return 'time' in annotation && !('endTime' in annotation);
};

export const filterOutOfTimeRange = (annotation: EventAnnotationOutput, timerange?: TimeRange) => {
  if (!timerange) {
    return false;
  }
  if (isRangeAnnotation(annotation)) {
    return !(annotation.time >= timerange.to || annotation.endTime < timerange.from);
  }
  if (isManualPointAnnotation(annotation)) {
    return annotation.time >= timerange.from && annotation.time <= timerange.to;
  }
};

export const sortByTime = (a: EventAnnotationOutput, b: EventAnnotationOutput) => {
  return a.time.localeCompare(b.time);
};

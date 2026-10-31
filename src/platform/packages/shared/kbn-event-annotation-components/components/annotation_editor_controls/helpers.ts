/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { transparentize } from '@elastic/eui';
import { pick } from 'lodash';
import { i18n } from '@kbn/i18n';
import chroma from 'chroma-js';
import type {
  EventAnnotationConfig,
  RangeEventAnnotationConfig,
  PointInTimeEventAnnotationConfig,
  QueryPointEventAnnotationConfig,
} from '@kbn/event-annotation-common';
import {
  AUTO_ANNOTATION_COLOR,
  isAutoAnnotationColor,
  isEsqlAnnotationConfig,
} from '@kbn/event-annotation-common';
import { isQueryAnnotationConfig, isRangeAnnotationConfig } from '../..';

export const defaultAnnotationLabel = i18n.translate(
  'eventAnnotationComponents.xyChart.defaultAnnotationLabel',
  {
    defaultMessage: 'Event',
  }
);

export const defaultRangeAnnotationLabel = i18n.translate(
  'eventAnnotationComponents.xyChart.defaultRangeAnnotationLabel',
  {
    defaultMessage: 'Event range',
  }
);

export const toRangeAnnotationColor = (color?: string) => {
  if (!color || isAutoAnnotationColor(color)) {
    return AUTO_ANNOTATION_COLOR;
  }
  return chroma(transparentize(color, 0.1)).hex().toUpperCase();
};

export const toLineAnnotationColor = (color?: string) => {
  if (!color || isAutoAnnotationColor(color)) {
    return AUTO_ANNOTATION_COLOR;
  }
  return chroma(transparentize(color, 1)).hex().toUpperCase();
};

export const sanitizeProperties = (annotation: EventAnnotationConfig): EventAnnotationConfig => {
  if (isEsqlAnnotationConfig(annotation)) {
    const common = pick(annotation, [
      'type',
      'id',
      'label',
      'query',
      'timeField',
      'timeColumn',
      'textColumn',
      'extraColumns',
      'color',
      'isHidden',
    ]);
    if ('endTimeColumn' in annotation) {
      return {
        ...common,
        key: { type: 'range' },
        endTimeColumn: annotation.endTimeColumn,
        outside: annotation.outside,
      };
    }
    return {
      ...common,
      key: { type: 'point_in_time' },
      ...pick(annotation, ['icon', 'lineStyle', 'lineWidth', 'textVisibility']),
    };
  }
  if (isRangeAnnotationConfig(annotation)) {
    const rangeAnnotation: RangeEventAnnotationConfig = pick(annotation, [
      'type',
      'label',
      'key',
      'id',
      'isHidden',
      'color',
      'outside',
    ]);
    return rangeAnnotation;
  }
  if (isQueryAnnotationConfig(annotation)) {
    const lineAnnotation: QueryPointEventAnnotationConfig = pick(annotation, [
      'type',
      'id',
      'label',
      'key',
      'timeField',
      'isHidden',
      'lineStyle',
      'lineWidth',
      'color',
      'icon',
      'textVisibility',
      'textField',
      'filter',
      'extraFields',
    ]);
    return lineAnnotation;
  }
  const lineAnnotation: PointInTimeEventAnnotationConfig = pick(annotation, [
    'type',
    'id',
    'label',
    'key',
    'isHidden',
    'lineStyle',
    'lineWidth',
    'color',
    'icon',
    'textVisibility',
  ]);
  return lineAnnotation;
};

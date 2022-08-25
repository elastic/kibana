/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { transparentize } from '@elastic/eui';
import { euiLightVars } from '@kbn/ui-theme';
import Color from 'color';
import {
  EventAnnotationConfig,
  RangeEventAnnotationConfig,
  PointInTimeQueryEventAnnotationConfig,
} from '../../common';
export const defaultAnnotationColor = euiLightVars.euiColorAccent;
export const defaultAnnotationRangeColor = new Color(
  transparentize(defaultAnnotationColor, 0.1)
).hexa();

export const defaultAnnotationLabel = i18n.translate(
  'eventAnnotation.manualAnnotation.defaultAnnotationLabel',
  {
    defaultMessage: 'Event',
  }
);

export const isRangeAnnotation = (
  annotation?: EventAnnotationConfig
): annotation is RangeEventAnnotationConfig => {
  return Boolean(annotation && annotation?.key.type === 'range');
};

export const isQueryAnnotation = (
  annotation?: EventAnnotationConfig
): annotation is PointInTimeQueryEventAnnotationConfig => {
  return annotation?.type === 'query';
};

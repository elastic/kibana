/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { euiLightVars } from '@kbn/ui-theme';
import {
  EventAnnotationConfig,
  RangeEventAnnotationConfig,
  PointInTimeEventAnnotationConfig,
  QueryPointEventAnnotationConfig,
} from '../../common';
export const defaultAnnotationColor = euiLightVars.euiColorAccent;
// Do not compute it live as dependencies will add tens of Kbs to the plugin
export const defaultAnnotationRangeColor = `#F04E981A`; // defaultAnnotationColor with opacity 0.1

export const defaultAnnotationLabel = i18n.translate(
  'eventAnnotation.manualAnnotation.defaultAnnotationLabel',
  {
    defaultMessage: 'Event',
  }
);

export const isRangeAnnotationConfig = (
  annotation?: EventAnnotationConfig
): annotation is RangeEventAnnotationConfig => {
  return Boolean(annotation && annotation?.key.type === 'range');
};

export const isManualPointAnnotationConfig = (
  annotation?: EventAnnotationConfig
): annotation is PointInTimeEventAnnotationConfig => {
  return Boolean(annotation && 'timestamp' in annotation?.key);
};

export const isQueryAnnotationConfig = (
  annotation?: EventAnnotationConfig
): annotation is QueryPointEventAnnotationConfig => {
  return Boolean(annotation && annotation.type === 'query');
};

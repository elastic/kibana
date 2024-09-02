/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { euiLightVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import {
  EventAnnotationConfig,
  RangeEventAnnotationConfig,
  PointInTimeEventAnnotationConfig,
  QueryPointEventAnnotationConfig,
} from './types';

export const defaultAnnotationColor = euiLightVars.euiColorAccent;
// Do not compute it live as dependencies will add tens of Kbs to the plugin
export const defaultAnnotationRangeColor = `#F04E981A`; // defaultAnnotationColor with opacity 0.1

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

export const createCopiedAnnotation = (
  newId: string,
  timestamp: string,
  source?: EventAnnotationConfig
): EventAnnotationConfig => {
  if (!source) {
    return getDefaultManualAnnotation(newId, timestamp);
  }
  return {
    ...source,
    id: newId,
  };
};

export const defaultAnnotationLabel = i18n.translate(
  'eventAnnotationCommon.manualAnnotation.defaultAnnotationLabel',
  {
    defaultMessage: 'Event',
  }
);

export const defaultRangeAnnotationLabel = i18n.translate(
  'eventAnnotationCommon.manualAnnotation.defaultRangeAnnotationLabel',
  {
    defaultMessage: 'Event range',
  }
);

export const getDefaultManualAnnotation = (
  id: string,
  timestamp: string
): EventAnnotationConfig => ({
  label: defaultAnnotationLabel,
  type: 'manual',
  key: {
    type: 'point_in_time',
    timestamp,
  },
  icon: 'triangle',
  id,
});

export const getDefaultQueryAnnotation = (
  id: string,
  fieldName: string,
  timeField: string
): EventAnnotationConfig => ({
  filter: {
    type: 'kibana_query',
    query: `${fieldName}: *`,
    language: 'kuery',
  },
  timeField,
  type: 'query',
  key: {
    type: 'point_in_time',
  },
  id,
  label: `${fieldName}: *`,
});

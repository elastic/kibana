/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import { euiLightVars } from '@kbn/ui-theme';
export const defaultAnnotationColor = euiLightVars.euiColorAccent;

export const defaultAnnotationLabel = i18n.translate(
  'eventAnnotation.manualAnnotation.defaultAnnotationLabel',
  {
    defaultMessage: 'Event',
  }
);

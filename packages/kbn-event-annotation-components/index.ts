/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  AnnotationEditorControls,
  annotationsIconSet,
} from './components/annotation_editor_controls';
export { getAnnotationAccessor } from './components';
export {
  defaultAnnotationColor,
  defaultAnnotationRangeColor,
  defaultAnnotationLabel,
  createCopiedAnnotation,
  isRangeAnnotationConfig,
  isManualPointAnnotationConfig,
  isQueryAnnotationConfig,
} from '@kbn/event-annotation-common';
export { EVENT_ANNOTATION_APP_NAME } from './constants';
export type { EventAnnotationServiceType } from './types';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export {
  AnnotationEditorControls,
  annotationsIconSet,
} from './components/annotation_editor_controls';
export { EventAnnotationGroupTableList } from './components';
export { getAnnotationAccessor } from './components/get_annotation_accessor';
export {
  defaultAnnotationColor,
  defaultAnnotationRangeColor,
  defaultAnnotationLabel,
  createCopiedAnnotation,
  isRangeAnnotationConfig,
  isManualPointAnnotationConfig,
  isQueryAnnotationConfig,
} from './util';
export { EVENT_ANNOTATION_APP_NAME } from './constants';
export type { EventAnnotationServiceType } from './types';

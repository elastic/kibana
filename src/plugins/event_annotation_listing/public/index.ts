/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventAnnotationListingPlugin } from './plugin';
export const plugin = () => new EventAnnotationListingPlugin();
export type {
  EventAnnotationListingPluginSetup as eventAnnotationListingPluginSetup,
  EventAnnotationListingPluginStart as eventAnnotationListingPluginStart,
} from './plugin';
export {
  defaultAnnotationColor,
  defaultAnnotationRangeColor,
  isRangeAnnotationConfig,
  isManualPointAnnotationConfig,
  isQueryAnnotationConfig,
} from '@kbn/event-annotation-common';
export {
  AnnotationEditorControls,
  annotationsIconSet,
  getAnnotationAccessor,
} from '@kbn/event-annotation-components';

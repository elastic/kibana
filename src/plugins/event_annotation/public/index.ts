/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: https://github.com/elastic/kibana/issues/110891
/* eslint-disable @kbn/eslint/no_export_all */

import { EventAnnotationPlugin } from './plugin';
export const plugin = () => new EventAnnotationPlugin();
export type { EventAnnotationPluginSetup, EventAnnotationPluginStart } from './plugin';
export * from './event_annotation_service/types';
export { EventAnnotationService } from './event_annotation_service';
export { defaultAnnotationColor } from './event_annotation_service/helpers';

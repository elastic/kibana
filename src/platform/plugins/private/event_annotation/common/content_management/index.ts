/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { LATEST_VERSION, CONTENT_ID } from './constants';

export type { EventAnnotationGroupContentType } from './types';

export type {
  EventAnnotationGroupSavedObject,
  PartialEventAnnotationGroupSavedObject,
  EventAnnotationGroupSavedObjectAttributes,
  EventAnnotationGroupGetIn,
  EventAnnotationGroupGetOut,
  EventAnnotationGroupCreateIn,
  EventAnnotationGroupCreateOut,
  CreateOptions,
  EventAnnotationGroupUpdateIn,
  EventAnnotationGroupUpdateOut,
  UpdateOptions,
  EventAnnotationGroupDeleteIn,
  EventAnnotationGroupDeleteOut,
  EventAnnotationGroupSearchIn,
  EventAnnotationGroupSearchOut,
  EventAnnotationGroupSearchQuery,
  EventAnnotationGroupCrudTypes,
} from './latest';

export * as EventAnnotationGroupV1 from './v1';

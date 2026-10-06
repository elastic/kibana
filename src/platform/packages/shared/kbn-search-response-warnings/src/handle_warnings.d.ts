/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { NotificationsStart } from '@kbn/core/public';
import type { Start as InspectorStart, RequestAdapter } from '@kbn/inspector-plugin/public';
import type { WarningHandlerCallback } from './types';
interface Services {
  inspector: InspectorStart;
  notifications: NotificationsStart;
}
/**
 * @internal
 * All warnings are expected to come from the same response.
 */
export declare function handleWarnings({
  callback,
  request,
  requestId,
  requestName,
  requestAdapter,
  response,
  services,
}: {
  callback?: WarningHandlerCallback;
  request: estypes.SearchRequest;
  requestAdapter: RequestAdapter;
  requestId?: string;
  requestName: string;
  response: estypes.SearchResponse;
  services: Services;
}): void;
export {};

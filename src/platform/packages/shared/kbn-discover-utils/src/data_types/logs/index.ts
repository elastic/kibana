/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type * from './types';
export * from './utils';

export * from './logs_context_service';
export * from './components';

export { DEFAULT_LOGS_PROFILE, type DefaultLogsProfile } from './recommended_fields/default_logs';

export {
  APACHE_ERROR_LOGS_PROFILE,
  type ApacheErrorLogsProfile,
} from './recommended_fields/apache_error_logs';

export {
  KUBERNETES_CONTAINER_LOGS_PROFILE,
  type KubernetesContainerLogsProfile,
} from './recommended_fields/kubernetes_container_logs';

export { ALL_RECOMMENDED_FIELDS_FOR_ESQL } from './recommended_fields';

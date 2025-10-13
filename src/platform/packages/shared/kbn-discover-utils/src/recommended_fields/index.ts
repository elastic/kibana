/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RecommendedField } from '@kbn/esql-types';
import { DEFAULT_LOGS_PROFILE } from './profiles/default_logs';
import { APACHE_ERROR_LOGS_PROFILE } from './profiles/apache_error_logs';
import { KUBERNETES_CONTAINER_LOGS_PROFILE } from './profiles/kubernetes_container_logs';

export { DEFAULT_LOGS_PROFILE, type DefaultLogsProfile } from './profiles/default_logs';

export {
  APACHE_ERROR_LOGS_PROFILE,
  type ApacheErrorLogsProfile,
} from './profiles/apache_error_logs';

export {
  KUBERNETES_CONTAINER_LOGS_PROFILE,
  type KubernetesContainerLogsProfile,
} from './profiles/kubernetes_container_logs';

/**
 * Merged list of all recommended fields for ES|QL autocomplete.
 */
export const ALL_RECOMMENDED_FIELDS_FOR_ESQL: RecommendedField[] = [
  ...APACHE_ERROR_LOGS_PROFILE.fields.map((name) => ({
    name,
    pattern: APACHE_ERROR_LOGS_PROFILE.pattern,
  })),
  ...KUBERNETES_CONTAINER_LOGS_PROFILE.fields.map((name) => ({
    name,
    pattern: KUBERNETES_CONTAINER_LOGS_PROFILE.pattern,
  })),
  ...DEFAULT_LOGS_PROFILE.fields.map((name) => ({
    name,
    pattern: DEFAULT_LOGS_PROFILE.pattern,
  })),
];

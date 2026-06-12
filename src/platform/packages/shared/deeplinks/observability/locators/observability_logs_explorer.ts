/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';

// Will become a union once we have more origins
export interface ObservabilityLogsExplorerLocationState extends SerializableRecord {
  origin?: {
    id: 'application-log-onboarding';
  };
}

// To store the last used logs viewer (either of discover or observability-logs-explorer)
export const OBS_LOGS_EXPLORER_LOGS_VIEWER_KEY = 'obs-logs-explorer:lastUsedViewer';

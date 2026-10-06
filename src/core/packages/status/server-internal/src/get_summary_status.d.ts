/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginName } from '@kbn/core-base-common';
import { type CoreStatus, type ServiceStatus } from '@kbn/core-status-common';
import type { PluginStatus } from './types';
interface GetSummaryStatusParams {
  serviceStatuses?: CoreStatus;
  pluginStatuses?: Record<PluginName, PluginStatus>;
}
/**
 * Returns a single {@link ServiceStatus} that summarizes the most severe status level from a group of statuses.
 */
export declare const getSummaryStatus: ({
  serviceStatuses,
  pluginStatuses,
}: GetSummaryStatusParams) => ServiceStatus;
export {};

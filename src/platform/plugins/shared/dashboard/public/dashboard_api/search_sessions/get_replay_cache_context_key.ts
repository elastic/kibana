/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Filter, ProjectRouting, TimeRange } from '@kbn/es-query';
import { stableStringify } from '@kbn/std';

/** Matches the time picker selection, pinned filters and project routing before replay. */
export const getReplayCacheContextKey = ({
  timeRange,
  pinnedFilters,
  projectRouting,
}: {
  timeRange: TimeRange | undefined;
  pinnedFilters: Filter[];
  projectRouting?: ProjectRouting;
}): string => stableStringify({ timeRange, pinnedFilters, projectRouting });

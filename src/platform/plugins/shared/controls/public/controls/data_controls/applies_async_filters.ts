/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppliesFilters } from '@kbn/presentation-publishing';
import { apiAppliesFilters } from '@kbn/presentation-publishing';

/**
 * Data control filter generation is async because
 * 1) filter generation requires a DataView
 * 2) filter generation is a subscription
 */
export type AppliesAsyncFilters = AppliesFilters & {
  untilFiltersReady: () => Promise<void>;
};

export const apiPublishesAsyncFilters = (
  unknownApi: unknown
): unknownApi is AppliesAsyncFilters => {
  return Boolean(
    unknownApi &&
      apiAppliesFilters(unknownApi) &&
      (unknownApi as AppliesAsyncFilters)?.untilFiltersReady !== undefined
  );
};

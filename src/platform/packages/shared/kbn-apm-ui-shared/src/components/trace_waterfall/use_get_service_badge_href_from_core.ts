/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WaterfallGetServiceBadgeHref } from '@kbn/apm-types';
import type { CoreStart } from '@kbn/core/public';
import { useCallback } from 'react';

export function useGetServiceBadgeHrefFromCore(
  core: CoreStart,
  rangeFrom: string,
  rangeTo: string
): WaterfallGetServiceBadgeHref {
  return useCallback(
    (serviceName: string) => {
      const queryParams = new URLSearchParams({ rangeFrom, rangeTo });
      return core.application.getUrlForApp('apm', {
        path: `/services/${encodeURIComponent(serviceName)}/overview?${queryParams.toString()}`,
      });
    },
    [core, rangeFrom, rangeTo]
  );
}

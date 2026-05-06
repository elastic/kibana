/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import { useEffect, useState } from 'react';
import type { EnvironmentHealthResponse } from '../../../../common/environment_health';
import { MANAGEMENT_LANDING_ENVIRONMENT_HEALTH_API_PATH } from '../../../../common/environment_health';

export type EnvironmentHealthLoadState = 'loading' | 'error' | 'ready';

export function useManagementEnvironmentHealth(http: HttpStart) {
  const [loadState, setLoadState] = useState<EnvironmentHealthLoadState>('loading');
  const [data, setData] = useState<EnvironmentHealthResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const body = await http.get<EnvironmentHealthResponse>(
          MANAGEMENT_LANDING_ENVIRONMENT_HEALTH_API_PATH
        );
        if (!cancelled) {
          setData(body);
          setLoadState('ready');
        }
      } catch {
        if (!cancelled) {
          setLoadState('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [http]);

  return { loadState, data };
}

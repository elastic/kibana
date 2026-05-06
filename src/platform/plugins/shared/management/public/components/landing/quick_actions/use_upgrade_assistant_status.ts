/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { HttpStart } from '@kbn/core/public';

interface EsDeprecationsResponse {
  totalCriticalDeprecations: number;
}

interface UpgradeAssistantStatus {
  isLoading: boolean;
  deprecationCount: number;
}

export function useUpgradeAssistantStatus(http: HttpStart): UpgradeAssistantStatus {
  const [isLoading, setIsLoading] = useState(true);
  const [deprecationCount, setDeprecationCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await http.get<EsDeprecationsResponse>(
          '/api/upgrade_assistant/es_deprecations'
        );
        if (!cancelled) {
          setDeprecationCount(response.totalCriticalDeprecations ?? 0);
        }
      } catch {
        // UA plugin may not be installed or user may lack permissions
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [http]);

  return { isLoading, deprecationCount };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { useKibana } from './use_kibana';

export interface ServiceAccountSummary {
  id: string;
  name: string;
}

export const useServiceAccount = (
  serviceAccountId?: string,
  shouldResolve = true
): ServiceAccountSummary | undefined => {
  const { http } = useKibana().services;
  const [serviceAccount, setServiceAccount] = useState<ServiceAccountSummary>();

  useEffect(() => {
    let mounted = true;
    setServiceAccount(undefined);

    if (!serviceAccountId || !shouldResolve) {
      return;
    }

    const loadServiceAccount = async () => {
      try {
        const response = await http.get<ServiceAccountSummary>(
          `/internal/security/service_account/${encodeURIComponent(serviceAccountId)}`
        );
        if (mounted) {
          setServiceAccount(response);
        }
      } catch {
        // Keep the persisted identity as the fallback when name resolution is unavailable.
      }
    };

    void loadServiceAccount();

    return () => {
      mounted = false;
    };
  }, [http, serviceAccountId, shouldResolve]);

  return serviceAccount;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { DiscoverServices } from '../../../build_services';

export function useHasShareIntegration({ share }: DiscoverServices) {
  const [hasShareIntegration, setHasShareIntegration] = useState<boolean>(false);

  useEffect(() => {
    let canceled = false;
    if (!share) return;
    const checkShareIntegration = async () => {
      const integrations = await share.availableIntegrations('search', 'export');
      if (!canceled) {
        setHasShareIntegration(integrations.length > 0);
      }
    };

    checkShareIntegration();

    return () => {
      canceled = true;
    };
  }, [share]);

  return hasShareIntegration;
}

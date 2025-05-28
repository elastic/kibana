/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { ContentSourceLoader } from '@kbn/content-management-content-source';
import type { DashboardApi } from '../../..';
import { loadDashboardApi } from '../../../dashboard_api/load_dashboard_api';

export const ExportJsonContainer = () => {
  const [dashboardApi, setDashboardApi] = useState<DashboardApi | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    if (error) setError(undefined);
    if (dashboardApi) setDashboardApi(undefined);

    let canceled = false;
    let cleanupDashboardApi: (() => void) | undefined;
    loadDashboardApi({})
      .then((results) => {
        if (!results) return;
        if (canceled) {
          results.cleanup();
          return;
        }

        cleanupDashboardApi = results.cleanup;
        setDashboardApi(results.api);
      })
      .catch((err) => {
        if (!canceled) setError(err);
      });

    return () => {
      cleanupDashboardApi?.();
      canceled = true;
    };
  }, [error, dashboardApi]);

  return <ContentSourceLoader getContent={async () => dashboardApi?.getSerializedState() ?? {}} />;
};

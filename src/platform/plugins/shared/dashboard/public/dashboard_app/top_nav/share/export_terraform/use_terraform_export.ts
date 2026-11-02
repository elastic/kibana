/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { DASHBOARD_INTERNAL_API_PATH } from '../../../../../common/constants';
import type { DashboardTerraformResponseBody } from '../../../../../server';
import { coreServices } from '../../../../services/kibana_services';
import { sanitizeDashboard } from '../export_json/sanitize_dashboard';

export type TerraformExportState =
  | { status: 'loading' }
  | { status: 'success'; conversion: DashboardTerraformResponseBody }
  | { status: 'error'; message: string };

const genericError = i18n.translate('dashboard.exportTerraform.genericError', {
  defaultMessage: 'The dashboard could not be converted. Try again later.',
});

// Only a client error carries a message meant for the user; server errors are detailed in the server logs.
const errorMessage = (error: IHttpFetchError<ResponseErrorBody>): string => {
  const status = error.response?.status ?? 0;
  const message = error.body?.message;
  return status >= 400 && status < 500 && typeof message === 'string' ? message : genericError;
};

/** Sanitizes the dashboard like Export → JSON, then converts the result with the Terraform route. */
export const useTerraformExport = (
  getExportJson: () => object
): TerraformExportState & { retry: () => void } => {
  const dashboardState = useMemo(() => getExportJson(), [getExportJson]);
  const [state, setState] = useState<TerraformExportState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    (async () => {
      try {
        const { data } = await sanitizeDashboard(dashboardState, controller.signal);
        const conversion = await coreServices.http.post<DashboardTerraformResponseBody>(
          `${DASHBOARD_INTERNAL_API_PATH}/_terraform`,
          { version: '1', body: JSON.stringify({ dashboard: data }), signal: controller.signal }
        );
        setState({ status: 'success', conversion });
      } catch (e) {
        if (controller.signal.aborted) return;
        setState({ status: 'error', message: errorMessage(e) });
      }
    })();
    return () => controller.abort();
  }, [dashboardState, attempt]);

  return { ...state, retry };
};

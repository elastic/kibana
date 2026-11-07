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
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { DASHBOARD_INTERNAL_API_PATH } from '../../../../../common/constants';
import type {
  DashboardSanitizeResponseBody,
  DashboardTerraformResponseBody,
} from '../../../../../server';
import { coreServices, spacesService } from '../../../../services/kibana_services';
import { fetchSanitizedDashboard } from '../export_json/sanitize_dashboard';

/** The sanitize step's warnings and the saved objects it found the dashboard refers to. */
export type SanitizeDetails = Omit<DashboardSanitizeResponseBody, 'data'>;

export type TerraformExportState =
  | { status: 'loading' }
  | {
      status: 'success';
      conversion: DashboardTerraformResponseBody;
      spaceId: string;
      sanitized: SanitizeDetails;
    }
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

// Without the Spaces plugin every saved object is in the default space.
const getActiveSpaceId = async (): Promise<string> =>
  spacesService ? (await spacesService.getActiveSpace()).id : DEFAULT_SPACE_ID;

/**
 * Sanitizes the dashboard like Export → JSON, then converts the result with the Terraform route;
 * also reads the active space, which an adopted dashboard is pinned to.
 */
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
        const [{ data, ...sanitized }, spaceId] = await Promise.all([
          fetchSanitizedDashboard(dashboardState, controller.signal),
          getActiveSpaceId(),
        ]);
        const conversion = await coreServices.http.post<DashboardTerraformResponseBody>(
          `${DASHBOARD_INTERNAL_API_PATH}/_terraform`,
          { version: '1', body: JSON.stringify({ dashboard: data }), signal: controller.signal }
        );
        setState({ status: 'success', conversion, spaceId, sanitized });
      } catch (e) {
        if (controller.signal.aborted) return;
        setState({ status: 'error', message: errorMessage(e) });
      }
    })();
    return () => controller.abort();
  }, [dashboardState, attempt]);

  return { ...state, retry };
};

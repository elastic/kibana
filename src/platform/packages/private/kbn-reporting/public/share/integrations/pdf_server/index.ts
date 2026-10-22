/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExportShare, RegisterShareIntegrationArgs } from '@kbn/share-plugin/public';
import type { ScreenCaptureExportShareOpts } from '../../share_context_menu';
import { checkLicense } from '../../..';
import { hasCapabilityByKey } from '../../shared';

/**
 * The real, first UI entry point for `@kbn/reporting-server-render`'s Chromium-free
 * `printablePdfServer` export type (see that package's README). Deliberately scoped to
 * `'dashboard'` only -- `renderDashboardReport` is the only locator-resolution path this
 * prototype implements (see `render_dashboard_report.ts`'s doc comment); a Lens/Canvas
 * locator has no `panelsJSON` to read and would need its own resolver.
 *
 * Gated on `xpack.reporting.experimental.serverRender` (the same flag that gates the
 * export types themselves server-side) via `prerequisiteCheck`'s `isServerRenderEnabled`,
 * in addition to the normal license/capability checks the real `pdfReports` integration
 * does -- this must never appear for a user if the experimental export types aren't even
 * registered server-side, since submitting a job for an unregistered `jobType` would just
 * fail.
 */
export const reportingPDFServerExportShareIntegration = ({
  apiClient,
  startServices$,
  isServerRenderEnabled,
}: ScreenCaptureExportShareOpts & {
  isServerRenderEnabled: boolean;
}): RegisterShareIntegrationArgs<ExportShare> => {
  const supportedObjectTypes = ['dashboard'];

  return {
    id: 'pdfServerReports',
    groupId: 'export',
    getShareIntegrationConfig: async (...args) => {
      const { getShareMenuItems } = await import('./pdf_server_export_config');
      return getShareMenuItems({ apiClient, startServices$, isExperimental: true })(...args);
    },
    prerequisiteCheck({ license, capabilities, objectType }) {
      if (!isServerRenderEnabled) {
        return false;
      }

      if (!license) {
        return false;
      }

      if (!supportedObjectTypes.includes(objectType)) {
        return false;
      }

      const { showLinks } = checkLicense(license.check('reporting', 'gold'));
      if (!showLinks) {
        return false;
      }

      return hasCapabilityByKey(capabilities, 'dashboard_v2');
    },
  };
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExportShare, RegisterShareIntegrationArgs } from '@kbn/share-plugin/public';
import type { ExportModalShareOpts } from '../../share_context_menu';
import { checkLicense } from '../../..';

export const reportingPDFExportShareIntegration = ({
  apiClient,
  usesUiCapabilities,
  startServices$,
}: ExportModalShareOpts): RegisterShareIntegrationArgs<ExportShare> => {
  const supportedObjectTypes = ['dashboard', 'visualization', 'lens'];

  return {
    id: 'pdfReports',
    groupId: 'export',
    getShareIntegrationConfig: async (...args) => {
      const { getShareMenuItems } = await import('./pdf_export_config');
      return getShareMenuItems({ apiClient, startServices$ })(...args);
    },
    prerequisiteCheck({ license, capabilities, objectType }) {
      if (!license) {
        return false;
      }

      let isSupportedType: boolean;

      if (!(isSupportedType = supportedObjectTypes.includes(objectType))) {
        return false;
      }

      const { showLinks: licenseHasScreenshotReporting } = checkLicense(
        license.check('reporting', 'gold')
      );

      let capabilityHasDashboardScreenshotReporting = false;
      let capabilityHasVisualizeScreenshotReporting = false;
      if (usesUiCapabilities) {
        capabilityHasDashboardScreenshotReporting =
          capabilities.dashboard?.generateScreenshot === true;
        capabilityHasVisualizeScreenshotReporting =
          capabilities.visualize?.generateScreenshot === true;
      } else {
        // deprecated
        capabilityHasDashboardScreenshotReporting = true;
        capabilityHasVisualizeScreenshotReporting = true;
      }

      if (!licenseHasScreenshotReporting) {
        return false;
      }

      if (objectType === 'dashboard' && !capabilityHasDashboardScreenshotReporting) {
        return false;
      }

      if (
        isSupportedType &&
        !capabilityHasVisualizeScreenshotReporting &&
        !capabilityHasDashboardScreenshotReporting
      ) {
        return false;
      }

      return true;
    },
  };
};

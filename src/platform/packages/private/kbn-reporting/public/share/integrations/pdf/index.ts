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
import { hasCapabilityByKey } from '../../shared';

export const reportingPDFExportShareIntegration = ({
  apiClient,
  startServices$,
}: ExportModalShareOpts): RegisterShareIntegrationArgs<ExportShare> => {
  const supportedObjectTypes = ['dashboard', 'visualization', 'lens', 'ai_value_report'];

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

      const { showLinks } = checkLicense(license.check('reporting', 'gold'));
      const licenseHasScreenshotReporting = showLinks;

      const capabilityHasDashboardReporting = hasCapabilityByKey(capabilities, 'dashboard_v2');
      const capabilityHasVisualizeReporting = hasCapabilityByKey(capabilities, 'visualize_v2');

      if (!licenseHasScreenshotReporting) {
        return false;
      }

      if (objectType === 'dashboard' && !capabilityHasDashboardReporting) {
        return false;
      }

      if (isSupportedType && !capabilityHasVisualizeReporting && !capabilityHasDashboardReporting) {
        return false;
      }

      return true;
    },
  };
};

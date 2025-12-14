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

export const reportingCsvExportShareIntegration = ({
  apiClient,
  startServices$,
  csvConfig,
  isServerless,
}: ExportModalShareOpts): RegisterShareIntegrationArgs<ExportShare> => {
  return {
    id: 'csvReports',
    groupId: 'export',
    getShareIntegrationConfig: async (...args) => {
      const { getShareMenuItems } = await import('./csv_export_config');
      return getShareMenuItems({ apiClient, startServices$, csvConfig, isServerless })(...args);
    },
    prerequisiteCheck: ({ license, capabilities }) => {
      if (!license) {
        return false;
      }

      const licenseCheck = checkLicense(license.check('reporting', 'basic'));

      const licenseHasCsvReporting = licenseCheck.showLinks;

      const capabilityHasCsvReporting =
        capabilities.discover_v2?.generateCsv === true ||
        capabilities.reportingLegacy?.generateReport === true;

      if (!(licenseHasCsvReporting && capabilityHasCsvReporting)) {
        return false;
      }

      return true;
    },
  };
};

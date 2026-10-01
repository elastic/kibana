/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { ImportJsonFlyoutContent } from '@kbn/as-code-import-flyout-component';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';

import { DASHBOARD_API_PATH, DASHBOARD_API_VERSION } from '../../../common/constants';
import type { DashboardCreateResponseBody } from '../../../server';
import { coreServices } from '../../services/kibana_services';
import { sanitizeDashboard } from '../../dashboard_app/top_nav/share/export_json/sanitize_dashboard';
import { importDashboardJsonStrings } from './_import_dashboard_json_strings';

interface ImportDashboardJsonFlyoutProps {
  closeFlyout: () => void;
  onImportSuccess: (id: string, title: string) => void;
  titleId: string;
}

export const ImportDashboardJsonFlyout = ({
  closeFlyout,
  onImportSuccess,
  titleId,
}: ImportDashboardJsonFlyoutProps) => {
  return (
    <ImportJsonFlyoutContent<DashboardState>
      title={importDashboardJsonStrings.getFlyoutTitle()}
      titleId={titleId}
      closeFlyout={closeFlyout}
      dataTestSubjPrefix="importDashboardJson"
      services={coreServices}
      isTechnicalPreview
      description={
        <EuiText size="s">
          <p>
            {importDashboardJsonStrings.getExportSourceNote()}{' '}
            <EuiLink
              href="https://www.elastic.co/docs/explore-analyze/dashboards/sharing#export-dashboards"
              target="_blank"
            >
              {importDashboardJsonStrings.getLearnMoreLabel()}
            </EuiLink>
          </p>
        </EuiText>
      }
      serverValidationErrorTitle={importDashboardJsonStrings.getServerValidationErrorTitle()}
      serverValidationErrorText={importDashboardJsonStrings.getServerValidationErrorText()}
      getWarningsSummary={importDashboardJsonStrings.getWarningsBody}
      sanitizeImportJson={sanitizeDashboard}
      createFromJson={async (data) => {
        const result = await coreServices.http.post<DashboardCreateResponseBody>(
          DASHBOARD_API_PATH,
          {
            version: DASHBOARD_API_VERSION,
            body: JSON.stringify(data),
          }
        );
        return { id: result.id, title: result.data.title ?? '' };
      }}
      onImportSuccess={onImportSuccess}
    />
  );
};

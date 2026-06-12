/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ExportShareParameters } from '@kbn/share-plugin/public';
import { ExportJsonFlyout, ExportJsonFlyoutContext } from '@kbn/as-code-export-utils';
import { sanitizeDashboard } from './sanitize_dashboard';
import { type DashboardState, DASHBOARD_API_PATH } from '../../common';
import { type DashboardSanitizeResponseBody } from '../../server';
import { coreServices, shareService } from '../services/kibana_services';

export const exportJsonConfig: ExportShareParameters = {
  label: ({ openFlyout }) => (
    <EuiButtonEmpty
      size="s"
      iconType="code"
      onClick={openFlyout}
      data-test-subj="exportMenuItem-JSON"
    >
      {i18n.translate('dashboard.exportJson.label', {
        defaultMessage: 'JSON',
      })}
    </EuiButtonEmpty>
  ),
  shouldRender: () => true,
  flyoutSizing: {
    size: 'm',
    maxWidth: 1000,
  },
  flyoutContent: ({ closeFlyout }) => (
    <ExportJsonFlyoutContext.Provider
      value={{ services: { core: coreServices, share: shareService } }}
    >
      <ExportJsonFlyout<DashboardState, DashboardSanitizeResponseBody['data']>
        closeFlyout={closeFlyout}
        sanitizeState={sanitizeDashboard}
        apiPath={DASHBOARD_API_PATH}
      />
    </ExportJsonFlyoutContext.Provider>
  ),
};

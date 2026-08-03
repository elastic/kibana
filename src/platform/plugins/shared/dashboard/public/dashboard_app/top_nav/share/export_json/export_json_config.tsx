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
import { useShareTypeContext } from '@kbn/share-plugin/public';

import { DASHBOARD_API_PATH, type DashboardState } from '../../../../../common';
import { type DashboardSanitizeResponseBody } from '../../../../../server';
import { sanitizeDashboard } from './sanitize_dashboard';
import { ExportJsonFlyout, type ExportJsonSharingData } from './flyout';

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
  flyoutContent: ({ closeFlyout }) => <ExportDashboardJsonFlyout closeFlyout={closeFlyout} />,
};

const ExportDashboardJsonFlyout = ({ closeFlyout }: { closeFlyout: () => void }) => {
  const { objectType, objectTypeAlias, sharingData } = useShareTypeContext(
    'integration',
    'exportDerivatives'
  );
  const typedSharingData = sharingData as unknown as ExportJsonSharingData<DashboardState>;
  const { title, getExportJson } = typedSharingData;

  return (
    <ExportJsonFlyout<DashboardState, DashboardSanitizeResponseBody['data']>
      apiPath={DASHBOARD_API_PATH}
      closeFlyout={closeFlyout}
      getExportJson={getExportJson}
      objectType={objectTypeAlias ?? objectType.toLocaleLowerCase()}
      sanitizeState={sanitizeDashboard}
      title={title}
    />
  );
};

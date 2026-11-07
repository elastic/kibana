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
import type { ExportJsonSharingData } from '@kbn/as-code-export-flyout-component';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import type { ExportShareParameters } from '@kbn/share-plugin/public';
import { useShareTypeContext } from '@kbn/share-plugin/public';
import { topNavStrings } from '../../../_dashboard_app_strings';
import { TerraformExportFlyout } from './terraform_export_flyout';

const ExportDashboardTerraformFlyout = ({ closeFlyout }: { closeFlyout: () => void }) => {
  const { sharingData, objectId, isDirty } = useShareTypeContext(
    'integration',
    'exportDerivatives'
  );
  const { title, getExportJson } = sharingData as unknown as ExportJsonSharingData<DashboardState>;
  return (
    <TerraformExportFlyout
      title={title}
      dashboardId={objectId}
      isDirty={isDirty}
      getExportJson={getExportJson}
      closeFlyout={closeFlyout}
    />
  );
};

export const exportTerraformConfig: ExportShareParameters = {
  label: ({ openFlyout }) => (
    <EuiButtonEmpty
      size="s"
      iconType="pipelineApp"
      onClick={openFlyout}
      data-test-subj="exportMenuItem-Terraform"
    >
      {topNavStrings.export.terraformLabel}
    </EuiButtonEmpty>
  ),
  shouldRender: () => true,
  flyoutSizing: { size: 'm', maxWidth: 1100 },
  flyoutAriaLabel: i18n.translate('dashboard.exportTerraform.flyoutAriaLabel', {
    defaultMessage: 'Export dashboard as Terraform',
  }),
  flyoutContent: ({ closeFlyout }) => <ExportDashboardTerraformFlyout closeFlyout={closeFlyout} />,
};

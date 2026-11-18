/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiButtonEmpty, useGeneratedHtmlId } from '@elastic/eui';
import type { ExportReferencedObjectsResponse } from '@kbn/saved-objects-management-plugin/common';
import type { ExportShareParameters } from '@kbn/share-plugin/public';
import { downloadFileAs, useShareTypeContext } from '@kbn/share-plugin/public';

import { DASHBOARD_API_PATH, DASHBOARD_API_VERSION } from '../../../../../common/constants';
import { coreServices } from '../../../../services/kibana_services';
import { exportReferencedObjectsStrings as strings } from './_export_referenced_objects_strings';
import { ExportReferencedObjectsFlyout } from './export_referenced_objects_flyout';

const exportDashboards = (ids: string[]) =>
  coreServices.http.post<ExportReferencedObjectsResponse>(`${DASHBOARD_API_PATH}/_export`, {
    version: DASHBOARD_API_VERSION,
    body: JSON.stringify({ ids }),
  });

const downloadExport = (filename: string, content: string) =>
  downloadFileAs(filename, { content, type: 'application/json' });

const ExportReferencedObjectsShareFlyout = ({ closeFlyout }: { closeFlyout: () => void }) => {
  const { objectId } = useShareTypeContext('integration', 'exportDerivatives');
  const titleId = useGeneratedHtmlId({ prefix: 'exportReferencedObjectsTitle' });
  return (
    <ExportReferencedObjectsFlyout
      dashboardId={objectId}
      titleId={titleId}
      closeFlyout={closeFlyout}
      exportDashboards={exportDashboards}
      downloadExport={downloadExport}
    />
  );
};

export const exportReferencedObjectsConfig: ExportShareParameters = {
  label: ({ openFlyout }) => (
    <EuiButtonEmpty
      size="s"
      iconType="upload"
      onClick={openFlyout}
      data-test-subj="exportMenuItem-exportReferencedObjects"
    >
      {strings.getMenuItemLabel()}
    </EuiButtonEmpty>
  ),
  shouldRender: () => true,
  flyoutSizing: { size: 'm', maxWidth: 1000 },
  flyoutAriaLabel: strings.getFlyoutTitle(),
  flyoutContent: ({ closeFlyout }) => (
    <ExportReferencedObjectsShareFlyout closeFlyout={closeFlyout} />
  ),
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { openLazyFlyout } from '@kbn/presentation-util';
import { coreServices } from '../../services/kibana_services';

export const openExportReferencedObjectsFlyout = ({
  dashboardIds,
  returnFocus,
}: {
  dashboardIds: string[];
  returnFocus?: () => void;
}) => {
  openLazyFlyout({
    core: coreServices,
    returnFocus,
    loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
      const [{ ExportReferencedObjectsFlyout }, { downloadExport, exportDashboards }] =
        await Promise.all([
          import(
            '../../dashboard_app/top_nav/share/export_referenced_objects/export_referenced_objects_flyout'
          ),
          import(
            '../../dashboard_app/top_nav/share/export_referenced_objects/export_referenced_objects_api'
          ),
        ]);
      return (
        <ExportReferencedObjectsFlyout
          dashboardIds={dashboardIds}
          titleId={ariaLabelledBy}
          closeFlyout={closeFlyout}
          exportDashboards={exportDashboards}
          downloadExport={downloadExport}
        />
      );
    },
    flyoutProps: {
      'data-test-subj': 'exportReferencedObjectsFlyout',
      type: 'overlay',
    },
  });
};

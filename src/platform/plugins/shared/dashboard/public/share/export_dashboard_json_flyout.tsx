/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  ExportJsonFlyout,
  ExportJsonFlyoutContext,
  type ExportJsonSharingData,
} from '@kbn/as-code-export-utils';
import { useShareTypeContext } from '@kbn/share-plugin/public';

import { sanitizeDashboard } from './sanitize_dashboard';
import { type DashboardState, DASHBOARD_API_PATH } from '../../common';
import { type DashboardSanitizeResponseBody } from '../../server';
import { coreServices } from '../services/kibana_services';

export const ExportDashboardJsonFlyout = ({ closeFlyout }: { closeFlyout: () => void }) => {
  const { objectType, objectTypeAlias, sharingData } = useShareTypeContext(
    'integration',
    'exportDerivatives'
  );
  const typedSharingData = sharingData as unknown as ExportJsonSharingData<DashboardState>;
  const { title, exportJson, isByReference } = typedSharingData;

  return (
    <ExportJsonFlyoutContext.Provider value={{ services: { core: coreServices } }}>
      <ExportJsonFlyout<DashboardState, DashboardSanitizeResponseBody['data']>
        apiPath={DASHBOARD_API_PATH}
        closeFlyout={closeFlyout}
        exportJson={exportJson}
        isByReference={isByReference}
        objectType={objectTypeAlias ?? objectType.toLocaleLowerCase()}
        sanitizeState={sanitizeDashboard}
        title={title}
      />
    </ExportJsonFlyoutContext.Provider>
  );
};

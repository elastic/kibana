/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CellActionsProvider } from '@kbn/cell-actions';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { UnifiedDataTable, UnifiedDataTableProps } from '@kbn/unified-data-table';
import React from 'react';
import { getModuleServices } from './kibana_services';

/**
 * Exposes a getter that allows the Unified Data Table to be used outside of the Discover plugin.
 */
export const getUnifiedDataTable = async () => {
  const services = await getModuleServices();

  return (props: Omit<UnifiedDataTableProps, 'services'>) => {
    return (
      <KibanaRenderContextProvider theme={services.core.theme} i18n={services.core.i18n}>
        <KibanaContextProvider services={services}>
          <CellActionsProvider
            getTriggerCompatibleActions={services.uiActions.getTriggerCompatibleActions}
          >
            <UnifiedDataTable {...props} services={services} />
          </CellActionsProvider>
        </KibanaContextProvider>
      </KibanaRenderContextProvider>
    );
  };
};

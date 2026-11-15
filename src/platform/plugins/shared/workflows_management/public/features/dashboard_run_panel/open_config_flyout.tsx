/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { openLazyFlyout } from '@kbn/presentation-util';
import { QueryClientProvider } from '@kbn/react-query';
import { ConfigFlyout } from './components/config_flyout';
import { getDashboardControls } from './lib/dashboard_controls';
import type { WorkflowRunPanelConfig } from './types';
import { queryClient } from '../../shared/lib/query_client';

interface OpenConfigFlyoutParams {
  core: CoreStart;
  parentApi: unknown;
  initialConfig?: WorkflowRunPanelConfig;
  onSave: (config: WorkflowRunPanelConfig, workflowName: string | undefined) => void;
  returnFocus?: () => void;
}

/** Opens the panel configuration flyout over the dashboard. */
export const openConfigFlyout = ({
  core,
  parentApi,
  initialConfig,
  onSave,
  returnFocus,
}: OpenConfigFlyoutParams): void => {
  openLazyFlyout({
    core,
    parentApi,
    returnFocus,
    loadContent: async ({ closeFlyout, ariaLabelledBy }) => (
      <KibanaContextProvider services={core}>
        <QueryClientProvider client={queryClient}>
          <ConfigFlyout
            http={core.http}
            ariaLabelledBy={ariaLabelledBy}
            controls={getDashboardControls(parentApi)}
            initialConfig={initialConfig}
            onCancel={closeFlyout}
            onSave={(config, workflowName) => {
              onSave(config, workflowName);
              closeFlyout();
            }}
          />
        </QueryClientProvider>
      </KibanaContextProvider>
    ),
  });
};

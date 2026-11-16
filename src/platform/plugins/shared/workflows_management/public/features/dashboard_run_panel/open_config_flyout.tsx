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
import { getDashboardControls } from './lib/dashboard_controls';
import type { WorkflowRunPanelConfig } from './types';
import { queryClient } from '../../shared/lib/query_client';

interface OpenConfigFlyoutParams {
  core: CoreStart;
  parentApi: unknown;
  initialConfig?: WorkflowRunPanelConfig;
  onSave: (config: WorkflowRunPanelConfig) => void;
  returnFocus?: () => void;
  /** The panel being edited, highlighted while the flyout is open. */
  focusedPanelId?: string;
}

/** Opens the panel configuration flyout over the dashboard. */
export const openConfigFlyout = ({
  core,
  parentApi,
  initialConfig,
  onSave,
  returnFocus,
  focusedPanelId,
}: OpenConfigFlyoutParams): void => {
  openLazyFlyout({
    core,
    parentApi,
    returnFocus,
    flyoutProps: { focusedPanelId },
    loadContent: async ({ closeFlyout, ariaLabelledBy }) => {
      const { ConfigFlyout } = await import('./components/config_flyout');
      return (
        <KibanaContextProvider services={core}>
          <QueryClientProvider client={queryClient}>
            <ConfigFlyout
              ariaLabelledBy={ariaLabelledBy}
              controls={getDashboardControls(parentApi)}
              initialConfig={initialConfig}
              onCancel={closeFlyout}
              onSave={(config) => {
                onSave(config);
                closeFlyout();
              }}
            />
          </QueryClientProvider>
        </KibanaContextProvider>
      );
    },
  });
};

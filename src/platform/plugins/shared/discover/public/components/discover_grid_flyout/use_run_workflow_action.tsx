/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { FlyoutActionItem } from '../../customizations';
import type { DiscoverServices } from '../../build_services';
import { RunWorkflowModal } from './run_workflow_modal';

export function useRunWorkflowAction(
  hit: DataTableRecord,
  services: DiscoverServices
): FlyoutActionItem {
  const executeWorkflowCapability =
    services.core.application.capabilities.workflowsManagement?.executeWorkflow;
  const hasPermission = Boolean(executeWorkflowCapability);

  return useMemo(
    () => ({
      id: 'runWorkflow',
      enabled: hasPermission,
      label: i18n.translate('discover.runWorkflow.actionLabel', {
        defaultMessage: 'Run workflow',
      }),
      helpText: hasPermission
        ? undefined
        : i18n.translate('discover.runWorkflow.noPermissionTooltip', {
            defaultMessage: 'You do not have permission to execute workflows',
          }),
      iconType: 'workflowsApp',
      dataTestSubj: 'discoverRunWorkflowAction',
      onClick: () => {
        // Create a QueryClient instance for the modal since it's rendered outside the main React tree
        const queryClient = new QueryClient();
        const overlayRef = services.core.overlays.openModal(
          toMountPoint(
            <KibanaContextProvider services={services.core}>
              <QueryClientProvider client={queryClient}>
                <RunWorkflowModal
                  document={hit}
                  core={services.core}
                  onClose={() => overlayRef.close()}
                />
              </QueryClientProvider>
            </KibanaContextProvider>,
            services.core
          )
        );
      },
    }),
    [hit, hasPermission, services.core]
  );
}

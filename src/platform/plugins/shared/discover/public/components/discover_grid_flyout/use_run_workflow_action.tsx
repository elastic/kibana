/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { EuiButtonIcon, EuiButtonEmpty, EuiToolTip } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { FlyoutActionItem } from '../../customizations';
import type { DiscoverServices } from '../../build_services';
import { RunWorkflowModal } from './run_workflow_modal';

interface RunWorkflowButtonProps {
  showIconOnly?: boolean;
  hit: DataTableRecord;
  services: DiscoverServices;
  hasPermission: boolean;
}

const RunWorkflowButton: React.FC<RunWorkflowButtonProps> = ({
  showIconOnly,
  hit,
  services,
  hasPermission,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useMemo(() => new QueryClient(), []);

  const button = showIconOnly ? (
    <EuiToolTip
      content={i18n.translate('discover.runWorkflow.actionLabel', {
        defaultMessage: 'Run workflow',
      })}
      disableScreenReaderOutput
    >
      <EuiButtonIcon
        size="s"
        iconType="workflowsApp"
        data-test-subj="discoverRunWorkflowAction"
        aria-label={i18n.translate('discover.runWorkflow.actionLabel', {
          defaultMessage: 'Run workflow',
        })}
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
      />
    </EuiToolTip>
  ) : (
    <EuiToolTip
      content={
        !hasPermission
          ? i18n.translate('discover.runWorkflow.noPermissionTooltip', {
              defaultMessage: 'You do not have permission to execute workflows',
            })
          : undefined
      }
      delay="long"
    >
      <EuiButtonEmpty
        size="s"
        iconSize="s"
        flush="both"
        iconType="workflowsApp"
        data-test-subj="discoverRunWorkflowAction"
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
      >
        {i18n.translate('discover.runWorkflow.actionLabel', {
          defaultMessage: 'Run workflow',
        })}
      </EuiButtonEmpty>
    </EuiToolTip>
  );

  return (
    <KibanaContextProvider services={services.core}>
      <QueryClientProvider client={queryClient}>
        <RunWorkflowModal
          document={hit}
          core={services.core}
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          button={button}
        />
      </QueryClientProvider>
    </KibanaContextProvider>
  );
};

export function useRunWorkflowAction(
  hit: DataTableRecord,
  services: DiscoverServices
): FlyoutActionItem & { Component?: React.ComponentType<{ showIconOnly?: boolean }> } {
  const executeWorkflowCapability =
    services.core.application.capabilities.workflowsManagement?.executeWorkflow;
  const hasPermission = Boolean(executeWorkflowCapability);

  const Component = useMemo(
    () => (props: { showIconOnly?: boolean }) => {
      return (
        <RunWorkflowButton {...props} hit={hit} services={services} hasPermission={hasPermission} />
      );
    },
    [hit, services, hasPermission]
  );

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
      onClick: () => {}, // Not used when Component is provided
      Component,
    }),
    [hasPermission, Component]
  );
}

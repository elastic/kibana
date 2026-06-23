/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import { useWorkflowExecutionsBulkActions } from './use_workflow_executions_bulk_actions';
import { useWorkflowExecutionsGridContext } from './workflow_executions_grid_context';

export interface WorkflowExecutionsSelectionBarProps {
  onRefresh: () => void;
  executions: WorkflowExecutionListItemDto[];
}

export const WorkflowExecutionsSelectionBar = ({
  onRefresh,
  executions,
}: WorkflowExecutionsSelectionBarProps) => {
  const { euiTheme } = useEuiTheme();
  const { selectedExecutionIds, selectedExecutionsCount, clearAllSelectedExecutions } =
    useWorkflowExecutionsGridContext();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const { panels } = useWorkflowExecutionsBulkActions({
    onRefresh,
    onAction: closePopover,
    executions,
    selectedExecutionIds,
  });

  if (selectedExecutionsCount === 0 || panels.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="flexStart"
      gutterSize="s"
      responsive={false}
      data-test-subj="workflow-executions-table-utility-bar-actions"
      css={css`
        block-size: ${euiTheme.size.l};
        min-block-size: ${euiTheme.size.l};
        max-block-size: ${euiTheme.size.l};
      `}
    >
      <EuiFlexItem data-test-subj="workflow-executions-table-selected-count" grow={false}>
        <EuiText size="xs" color="subdued">
          {i18n.translate('workflowsManagement.executionsPage.utilityBar.selectedExecutions', {
            defaultMessage: '{count} selected',
            values: { count: selectedExecutionsCount },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          aria-label={i18n.translate(
            'workflowsManagement.executionsPage.utilityBar.bulkActionsPopoverAriaLabel',
            {
              defaultMessage: 'Bulk actions',
            }
          )}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          panelPaddingSize="none"
          data-test-subj="workflow-executions-table-bulk-actions-popover"
          button={
            <EuiButtonEmpty
              onClick={togglePopover}
              size="xs"
              iconSide="right"
              iconType="chevronSingleDown"
              flush="left"
              data-test-subj="workflow-executions-table-bulk-actions-button"
              aria-label={i18n.translate(
                'workflowsManagement.executionsPage.utilityBar.bulkActions',
                {
                  defaultMessage: 'Bulk actions',
                }
              )}
            >
              {i18n.translate('workflowsManagement.executionsPage.utilityBar.bulkActions', {
                defaultMessage: 'Bulk actions',
              })}
            </EuiButtonEmpty>
          }
        >
          <EuiContextMenu
            panels={panels}
            initialPanelId={0}
            data-test-subj="workflow-executions-table-bulk-actions-context-menu"
          />
        </EuiPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          onClick={clearAllSelectedExecutions}
          size="xs"
          iconSide="left"
          iconType="cross"
          flush="left"
          data-test-subj="workflow-executions-clear-selection-button"
          aria-label={i18n.translate(
            'workflowsManagement.executionsPage.utilityBar.clearSelection',
            {
              defaultMessage: 'Clear selection',
            }
          )}
        >
          {i18n.translate('workflowsManagement.executionsPage.utilityBar.clearSelection', {
            defaultMessage: 'Clear selection',
          })}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

WorkflowExecutionsSelectionBar.displayName = 'WorkflowExecutionsSelectionBar';

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
import React, { useCallback, useContext, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { i18n } from '@kbn/i18n';
import { UnifiedDataTableContext } from '@kbn/unified-data-table/src/table_context';
import { useWorkflowExecutionsBulkActions } from './use_workflow_executions_bulk_actions';

export interface WorkflowExecutionsSelectionBarProps {
  onRefresh: () => void;
  rows: DataTableRecord[];
}

export const WorkflowExecutionsSelectionBar = ({
  onRefresh,
  rows,
}: WorkflowExecutionsSelectionBarProps) => {
  const { euiTheme } = useEuiTheme();
  const { selectedDocsState } = useContext(UnifiedDataTableContext);
  const { selectedDocsCount, docIdsInSelectionOrder, clearAllSelectedDocs } = selectedDocsState;
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => setIsPopoverOpen((isOpen) => !isOpen), []);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const { panels } = useWorkflowExecutionsBulkActions({
    onRefresh,
    onAction: closePopover,
    rows,
    selectedDocIds: docIdsInSelectionOrder,
  });

  if (selectedDocsCount === 0 || panels.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="flexStart"
      gutterSize="s"
      css={css`
        padding: ${euiTheme.size.s} ${euiTheme.size.s} 0;
      `}
      data-test-subj="workflow-executions-table-utility-bar-actions"
    >
      <EuiFlexItem data-test-subj="workflow-executions-table-selected-count" grow={false}>
        <EuiText size="s" color="subdued">
          {i18n.translate('workflowsManagement.executionsPage.utilityBar.selectedExecutions', {
            defaultMessage: '{count} selected',
            values: { count: selectedDocsCount },
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
              size="s"
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
          onClick={clearAllSelectedDocs}
          size="s"
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

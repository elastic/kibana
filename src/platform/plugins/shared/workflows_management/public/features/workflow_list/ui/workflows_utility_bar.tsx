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
import { i18n } from '@kbn/i18n';
import type { WorkflowListItemDto } from '@kbn/workflows';
import React, { useCallback, useState } from 'react';
import { useWorkflowBulkActions } from './use_workflow_bulk_actions';

interface WorkflowsUtilityBarProps {
  totalWorkflows: number;
  selectedWorkflows: WorkflowListItemDto[];
  deselectWorkflows: () => void;
  onRefresh: () => void;
  showStart: number;
  showEnd: number;
}

export const WorkflowsUtilityBar: React.FC<WorkflowsUtilityBarProps> = ({
  totalWorkflows,
  selectedWorkflows,
  deselectWorkflows,
  onRefresh,
  showStart,
  showEnd,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = useCallback(() => setIsPopoverOpen(!isPopoverOpen), [isPopoverOpen]);
  const closePopover = useCallback(() => setIsPopoverOpen(false), []);

  const onActionSuccess = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const { panels, modals } = useWorkflowBulkActions({
    selectedWorkflows,
    onAction: closePopover,
    onActionSuccess,
  });

  const showBulkActions = selectedWorkflows.length > 0;

  return (
    <>
      <EuiFlexGroup
        alignItems="center"
        justifyContent="spaceBetween"
        css={css`
          margin-top: ${euiTheme.size.s};
          padding-bottom: ${euiTheme.size.s};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexStart" gutterSize="s" alignItems="center">
            <EuiFlexItem
              data-test-subj="workflows-table-count"
              grow={false}
              css={css`
                border-right: ${euiTheme.border.thin};
                padding-right: ${euiTheme.size.s};
              `}
            >
              <EuiText size="s">
                {i18n.translate('workflows.utilityBar.showingWorkflows', {
                  defaultMessage: 'Showing {showStart}-{showEnd} of {total} workflows',
                  values: { showStart, showEnd, total: totalWorkflows },
                })}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem data-test-subj="workflows-table-utility-bar-actions" grow={false}>
              <EuiFlexGroup alignItems="center" justifyContent="flexStart" gutterSize="s">
                {showBulkActions && (
                  <>
                    <EuiFlexItem data-test-subj="workflows-table-selected-count" grow={false}>
                      <EuiText size="s" color="subdued">
                        {i18n.translate('workflows.utilityBar.selectedWorkflows', {
                          defaultMessage: '{count} selected',
                          values: { count: selectedWorkflows.length },
                        })}
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiPopover
                        isOpen={isPopoverOpen}
                        closePopover={closePopover}
                        panelPaddingSize="none"
                        data-test-subj="workflows-table-bulk-actions-popover"
                        button={
                          <EuiButtonEmpty
                            onClick={togglePopover}
                            size="s"
                            iconSide="right"
                            iconType="arrowDown"
                            flush="left"
                            data-test-subj="workflows-table-bulk-actions-button"
                            aria-label="Bulk actions"
                          >
                            {i18n.translate('workflows.utilityBar.bulkActions', {
                              defaultMessage: 'Bulk actions',
                            })}
                          </EuiButtonEmpty>
                        }
                      >
                        <EuiContextMenu
                          panels={panels}
                          initialPanelId={0}
                          data-test-subj="workflows-table-bulk-actions-context-menu"
                        />
                      </EuiPopover>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        onClick={deselectWorkflows}
                        size="s"
                        iconSide="left"
                        iconType="cross"
                        flush="left"
                        data-test-subj="workflows-clear-selection-button"
                        aria-label="Clear selection"
                      >
                        {i18n.translate('workflows.utilityBar.clearSelection', {
                          defaultMessage: 'Clear selection',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  </>
                )}
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={onRefresh}
                    size="s"
                    iconSide="left"
                    iconType="refresh"
                    flush="left"
                    data-test-subj="workflows-refresh-button"
                    aria-label="Refresh"
                  >
                    {i18n.translate('workflows.utilityBar.refresh', {
                      defaultMessage: 'Refresh',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {modals}
    </>
  );
};

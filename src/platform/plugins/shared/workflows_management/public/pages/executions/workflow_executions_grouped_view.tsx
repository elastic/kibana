/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn, EuiThemeComputed } from '@elastic/eui';
import {
  EuiAccordion,
  EuiBadge,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiFontSize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';
import type { RerunWorkflowExecutionParams } from './build_replay_inputs_from_execution_context';
import { type ExecutionsGroupBy, groupExecutions } from './workflow_executions_group_by';
import {
  getWorkflowExecutionActionContext,
  WorkflowExecutionActionsMenu,
} from './workflow_executions_table_actions';
import {
  WorkflowExecutionDurationCell,
  WorkflowExecutionStartedAtCell,
  WorkflowExecutionTagsCell,
  WorkflowExecutionTriggersCell,
  WorkflowExecutionWorkflowCell,
} from './workflow_executions_table_cells';

export interface WorkflowExecutionsGroupedViewProps {
  executions: WorkflowExecutionListItemDto[];
  groupBy: Exclude<ExecutionsGroupBy, 'none'>;
  onOpenExecution: (execution: WorkflowExecutionListItemDto) => void;
  onReRunExecution?: (params: RerunWorkflowExecutionParams) => Promise<void>;
  onViewAllExecutionsForWorkflow?: (workflowId: string) => void;
}

const groupingContainerCss = (euiTheme: EuiThemeComputed) => css`
  .executionsGroupingAccordion .euiAccordion__childWrapper .euiAccordion__children {
    margin-left: ${euiTheme.size.s};
    margin-right: ${euiTheme.size.s};
    border-left: ${euiTheme.border.thin};
    border-right: ${euiTheme.border.thin};
    border-bottom: ${euiTheme.border.thin};
    border-radius: 0 0 6px 6px;
  }

  .executionsGroupingAccordion .euiAccordion__triggerWrapper {
    border-bottom: ${euiTheme.border.thin};
    border-left: ${euiTheme.border.thin};
    border-right: ${euiTheme.border.thin};
    border-radius: 6px;
    min-height: 78px;
    padding-left: ${euiTheme.size.base};
    padding-right: ${euiTheme.size.base};
  }

  .executionsGroupingAccordion {
    border-top: ${euiTheme.border.thin};
    border-bottom: none;
    border-radius: 6px;
  }

  .executionsGroupingPanelRenderer {
    display: table;
    table-layout: fixed;
    width: 100%;
    padding-right: ${euiTheme.size.xl};
  }
`;

const GroupPanelTitle = ({ title }: { title: string }) => (
  <div className="executionsGroupingPanelRenderer" data-test-subj="executionsTableGroupHeader">
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false} className="eui-textTruncate">
        <EuiTitle size="xs">
          <h4 className="eui-textTruncate" title={title}>
            {title}
          </h4>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  </div>
);

const GroupStats = ({ count }: { count: number }) => {
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;
  const badgeValue = count > 99 ? '99+' : count.toString();
  const executionsLabel = i18n.translate(
    'workflowsManagement.executionsPage.table.groupBy.stat.executions',
    { defaultMessage: 'Executions' }
  );

  return (
    <EuiFlexGroup
      data-test-subj="executionsTableGroupStats"
      gutterSize="m"
      alignItems="center"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <span
          css={css`
            font-size: ${xsFontSize};
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
        >
          {executionsLabel}
          <EuiToolTip position="top" content={count}>
            <EuiBadge
              tabIndex={0}
              color="hollow"
              css={css`
                margin-left: ${euiTheme.size.s};
                width: 35px;
                .euiBadge__text {
                  text-align: center;
                  width: 100%;
                }
              `}
              data-test-subj="executionsTableGroupCount"
            >
              {badgeValue}
            </EuiBadge>
          </EuiToolTip>
        </span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const GroupTable = React.memo<{
  executions: WorkflowExecutionListItemDto[];
  onOpenExecution: (execution: WorkflowExecutionListItemDto) => void;
  onReRunExecution?: (params: RerunWorkflowExecutionParams) => Promise<void>;
  onViewAllExecutionsForWorkflow?: (workflowId: string) => void;
}>(({ executions, onOpenExecution, onReRunExecution, onViewAllExecutionsForWorkflow }) => {
  const { euiTheme } = useEuiTheme();

  const columns = useMemo<Array<EuiBasicTableColumn<WorkflowExecutionListItemDto>>>(
    () => [
      {
        field: 'workflow',
        name: i18n.translate('workflowsManagement.executionsPage.column.workflow', {
          defaultMessage: 'Workflow',
        }),
        render: (_value, execution) => (
          <WorkflowExecutionWorkflowCell execution={execution} onOpen={onOpenExecution} />
        ),
      },
      {
        field: 'tags',
        name: i18n.translate('workflowsManagement.executionsPage.column.tags', {
          defaultMessage: 'Tags',
        }),
        width: '250px',
        render: (_value, execution) => <WorkflowExecutionTagsCell execution={execution} />,
      },
      {
        field: 'triggers',
        name: i18n.translate('workflowsManagement.executionsPage.column.trigger', {
          defaultMessage: 'Trigger',
        }),
        width: '250px',
        render: (_value, execution) => <WorkflowExecutionTriggersCell execution={execution} />,
      },
      {
        field: 'startedAt',
        name: i18n.translate('workflowsManagement.executionsPage.column.started', {
          defaultMessage: 'Started',
        }),
        width: '250px',
        render: (_value, execution) => <WorkflowExecutionStartedAtCell execution={execution} />,
      },
      {
        field: 'duration',
        name: i18n.translate('workflowsManagement.executionsPage.column.duration', {
          defaultMessage: 'Duration',
        }),
        width: '250px',
        align: 'right',
        render: (_value, execution) => <WorkflowExecutionDurationCell execution={execution} />,
      },
      {
        name: i18n.translate('workflowsManagement.executionsPage.column.actions', {
          defaultMessage: 'Actions',
        }),
        width: '56px',
        align: 'right',
        render: (execution: WorkflowExecutionListItemDto) => (
          <WorkflowExecutionActionsMenu
            actionContext={getWorkflowExecutionActionContext(execution)}
            onReRunExecution={onReRunExecution}
            onViewAllExecutionsForWorkflow={onViewAllExecutionsForWorkflow}
            variant="icon"
          />
        ),
      },
    ],
    [onOpenExecution, onReRunExecution, onViewAllExecutionsForWorkflow]
  );

  return (
    <EuiBasicTable
      tableCaption={i18n.translate(
        'workflowsManagement.executionsPage.table.groupBy.tableCaption',
        {
          defaultMessage: 'Executions in this group',
        }
      )}
      items={executions}
      columns={columns}
      tableLayout="auto"
      css={css`
        .euiTableRowCell {
          vertical-align: middle;
        }
        .euiTableHeaderCell {
          background-color: ${euiTheme.components.dataGridRowBackground};
        }
      `}
    />
  );
});

GroupTable.displayName = 'GroupTable';

export const WorkflowExecutionsGroupedView = React.memo<WorkflowExecutionsGroupedViewProps>(
  ({ executions, groupBy, onOpenExecution, onReRunExecution, onViewAllExecutionsForWorkflow }) => {
    const { euiTheme } = useEuiTheme();
    const xsFontSize = useEuiFontSize('xs').fontSize;
    const accordionId = useGeneratedHtmlId({ prefix: 'executionsTableGroups' });
    // TODO: server-side aggregation for correct counts across the full result set.
    const groups = useMemo(() => groupExecutions(executions, groupBy), [executions, groupBy]);
    const [openGroupKey, setOpenGroupKey] = useState<string | null>(null);

    useEffect(() => {
      setOpenGroupKey(null);
    }, [groupBy]);

    const handleToggle = useCallback((groupKey: string, isOpen: boolean) => {
      setOpenGroupKey(isOpen ? groupKey : null);
    }, []);

    const summaryCss = css`
      font-size: ${xsFontSize};
      font-weight: ${euiTheme.font.weight.semiBold};
    `;

    if (groups.length === 0) {
      return (
        <div data-test-subj="executionsTableGroupedView">
          <EuiText size="s" color="subdued">
            {i18n.translate('workflowsManagement.executionsPage.table.groupBy.empty', {
              defaultMessage: 'No executions to group.',
            })}
          </EuiText>
        </div>
      );
    }

    return (
      <div css={groupingContainerCss(euiTheme)} data-test-subj="executionsTableGroupedView">
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText css={summaryCss} data-test-subj="executionsTableGroupSummary">
              {i18n.translate('workflowsManagement.executionsPage.table.groupBy.summary', {
                defaultMessage:
                  '{executionCount} {executionCount, plural, one {execution} other {executions}} | {groupCount} {groupCount, plural, one {group} other {groups}}',
                values: {
                  executionCount: executions.length,
                  groupCount: groups.length,
                },
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {groups.map((group, index) => {
          const isOpen = openGroupKey === group.key;
          return (
            <React.Fragment key={group.key}>
              {index > 0 ? <EuiSpacer size="s" /> : null}
              <EuiAccordion
                id={`${accordionId}-${group.key}`}
                className="executionsGroupingAccordion"
                buttonElement="div"
                buttonContent={<GroupPanelTitle title={group.label} />}
                extraAction={<GroupStats count={group.executions.length} />}
                forceState={isOpen ? 'open' : 'closed'}
                onToggle={(nextIsOpen) => handleToggle(group.key, nextIsOpen)}
                paddingSize="m"
                data-test-subj={`executionsTableGroup-${group.key}`}
              >
                {isOpen ? (
                  <GroupTable
                    executions={group.executions}
                    onOpenExecution={onOpenExecution}
                    onReRunExecution={onReRunExecution}
                    onViewAllExecutionsForWorkflow={onViewAllExecutionsForWorkflow}
                  />
                ) : (
                  <span />
                )}
              </EuiAccordion>
            </React.Fragment>
          );
        })}
      </div>
    );
  }
);

WorkflowExecutionsGroupedView.displayName = 'WorkflowExecutionsGroupedView';

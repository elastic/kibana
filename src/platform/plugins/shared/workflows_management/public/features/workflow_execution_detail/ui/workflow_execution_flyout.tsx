/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  copyToClipboard,
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextTruncate,
  EuiTitle,
  EuiToken,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { Criteria, EuiBasicTableColumn } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { AiStepSection } from './ai_step_section';
import { ExecutionTakeActionSplitButton } from './execution_take_action_split_button';
import { ForeachIterationsSection } from './foreach_iterations_section';
import { StepDataValueCell } from './step_data_value_cell';
import { StepDetailAccordionSection } from './step_detail_accordion_section';
import {
  buildOverviewStepExecutionFromContext,
  buildTriggerStepExecutionFromContext,
} from './workflow_pseudo_step_context';
import { WorkflowStepExecutionTree } from './workflow_step_execution_tree';
import {
  useAvailableConnectors,
  useFetchConnector,
} from '../../../entities/connectors/model/use_available_connectors';
import { useWorkflowExecutionPolling } from '../../../entities/workflows/model/use_workflow_execution_polling';
import { useNavigateToExecution } from '../../../hooks/navigation/use_navigate_to_execution';
import { useKibana } from '../../../hooks/use_kibana';
import { formatDuration } from '../../../shared/lib/format_duration';
import { getStatusLabel } from '../../../shared/translations/status_translations';
import { FormattedRelativeEnhanced } from '../../../shared/ui/formatted_relative_enhanced/formatted_relative_enhanced';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { TokenUsageBreakdown } from '../../../shared/ui/token_usage_badge/token_usage_breakdown';
import { formatExecutionTimestamp } from '../../../shared/ui/use_formatted_date';
import {
  buildIterationPseudoStep,
  isIterationPseudoStepId,
} from '../lib/build_iteration_pseudo_step';
import { findStepConnectorId } from '../lib/find_step_connector_id';
import { getFailedStepPosition } from '../lib/get_failed_step_position';
import { getRunMode } from '../lib/get_run_mode';
import { isTokenUsageTableField } from '../lib/is_token_usage_table_field';
import { normalizeStepAi } from '../lib/normalize_step_ai';
import { useChildWorkflowExecutions } from '../model/use_child_workflow_executions';
import { useStepExecution } from '../model/use_step_execution';

export interface WorkflowExecutionFlyoutProps {
  executionId: string;
  /** Optional; falls back to the loaded execution / definition name. */
  workflowName?: string;
  /** Optional; falls back to tags on the workflow definition when present. */
  workflowTags?: string[];
  onClose: () => void;
}

type FlyoutTabId = 'table' | 'json';

const i18nTexts = {
  back: i18n.translate('workflows.executionFlyout.back', { defaultMessage: 'Back' }),
  result: i18n.translate('workflows.executionFlyout.result', { defaultMessage: 'Result' }),
  executionTime: i18n.translate('workflows.executionFlyout.executionTime', {
    defaultMessage: 'Execution time',
  }),
  executedBy: i18n.translate('workflows.executionFlyout.executedBy', {
    defaultMessage: 'Executed by',
  }),
  tableTab: i18n.translate('workflows.executionFlyout.tableTab', { defaultMessage: 'Table' }),
  jsonTab: i18n.translate('workflows.executionFlyout.jsonTab', { defaultMessage: 'JSON' }),
  share: i18n.translate('workflows.executionFlyout.share', { defaultMessage: 'Share' }),
  close: i18n.translate('workflows.executionFlyout.close', { defaultMessage: 'Close' }),
  testRun: i18n.translate('workflows.executionFlyout.runMode.testRun', {
    defaultMessage: 'Test run',
  }),
  linkCopied: i18n.translate('workflows.executionFlyout.share.linkCopied', {
    defaultMessage: 'Execution link copied',
  }),
};

const FLYOUT_CLASSNAME = 'workflowExecutionFlyout';
/** Keep slim enough that the YAML editor stays readable with both panels open. */
const EXECUTION_PANEL_WIDTH = 560;
const STEP_DETAIL_WIDTH = 560;
/** Field column: content-sized between a header-comfortable min and a path-truncation max. */
const FIELD_COLUMN_MIN_PX = 100;
const FIELD_COLUMN_MAX_PX = 160;

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'null';
interface StepDataTableRow {
  field: string;
  value: string;
  fieldType: FieldType;
}

const fieldTypeToToken: Record<FieldType, string> = {
  string: 'tokenString',
  number: 'tokenNumber',
  boolean: 'tokenBoolean',
  array: 'tokenArray',
  null: 'tokenNull',
};

const flattenToRows = (
  value: unknown,
  prefix = ''
): Array<{ field: string; value: string; fieldType: FieldType }> => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, val]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      return flattenToRows(val, fullKey);
    }
    const fieldType: FieldType =
      val === null ? 'null' : Array.isArray(val) ? 'array' : (typeof val as FieldType);
    const display =
      val === null
        ? 'null'
        : Array.isArray(val)
        ? JSON.stringify(val)
        : typeof val === 'string'
        ? val
        : String(val);
    return [{ field: fullKey, value: display, fieldType }];
  });
};

/** Table view only — AI section owns tokenUsage presentation. JSON view stays raw. */
const filterTokenUsageFromTableRows = <T extends { field: string }>(rows: T[]): T[] =>
  rows.filter((row) => !isTokenUsageTableField(row.field));

const isTableable = (v: unknown): boolean =>
  v !== null &&
  v !== undefined &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.keys(v as object).length > 0;

const STEP_TEST_NAME_MAX_LEN = 24;

const truncateStepName = (name: string): string =>
  name.length > STEP_TEST_NAME_MAX_LEN ? `${name.slice(0, STEP_TEST_NAME_MAX_LEN)}…` : name;

const SECTION_PAGE_SIZE = 10;

const StepDataSection = ({ label, data }: { label: string; data: unknown }) => {
  const { euiTheme } = useEuiTheme();
  const [view, setView] = useState<'table' | 'code'>(() => (isTableable(data) ? 'table' : 'code'));
  const [isViewPopoverOpen, setIsViewPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageIndex, setPageIndex] = useState(0);

  const hasTable = isTableable(data);
  const effectiveView = hasTable ? view : 'code';

  const rows = useMemo(() => filterTokenUsageFromTableRows(flattenToRows(data)), [data]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter(
      (row) => row.field.toLowerCase().includes(term) || row.value.toLowerCase().includes(term)
    );
  }, [rows, searchTerm]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchTerm]);

  const pageCount = Math.ceil(filteredRows.length / SECTION_PAGE_SIZE);
  const paginatedRows = filteredRows.slice(
    pageIndex * SECTION_PAGE_SIZE,
    (pageIndex + 1) * SECTION_PAGE_SIZE
  );

  const emptyTableMessage =
    searchTerm.trim().length > 0
      ? i18n.translate('workflows.executionFlyout.stepDetail.noFieldsMatch', {
          defaultMessage: 'No fields match',
        })
      : i18n.translate('workflows.executionFlyout.stepDetail.noData', {
          defaultMessage: 'No data',
        });

  const tableColumns = useMemo<Array<EuiBasicTableColumn<StepDataTableRow>>>(
    () => [
      {
        field: 'field',
        name: i18n.translate('workflows.executionFlyout.stepDetail.fieldColumn', {
          defaultMessage: 'Field',
        }),
        className: 'workflowStepDataFieldCol',
        width: `${FIELD_COLUMN_MAX_PX}px`,
        render: (field: string, row) => (
          <div
            css={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              minWidth: 0,
              maxWidth: FIELD_COLUMN_MAX_PX,
              overflow: 'hidden',
            }}
          >
            <EuiToken
              iconType={fieldTypeToToken[row.fieldType]}
              size="xs"
              css={{ flexShrink: 0, width: '12px', height: '12px', margin: 0 }}
            />
            <EuiToolTip content={field} position="top">
              <span
                tabIndex={0}
                css={{
                  fontSize: '12px',
                  fontFamily: euiTheme.font.familyCode,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  // Truncate from the left so the leaf segment stays visible.
                  direction: 'rtl',
                  textAlign: 'left',
                }}
              >
                <bdi>{field}</bdi>
              </span>
            </EuiToolTip>
          </div>
        ),
      },
      {
        field: 'value',
        name: i18n.translate('workflows.executionFlyout.stepDetail.valueColumn', {
          defaultMessage: 'Value',
        }),
        className: 'workflowStepDataValueCol',
        truncateText: true,
        render: (value: string) => <StepDataValueCell value={value} />,
      },
    ],
    [euiTheme.font.familyCode]
  );

  const onTableChange = useCallback(({ page }: Criteria<StepDataTableRow>) => {
    if (page) {
      setPageIndex(page.index);
    }
  }, []);

  return (
    <StepDetailAccordionSection
      title={label}
      toggleAriaLabel={i18n.translate('workflows.executionFlyout.stepDetail.toggleNamedSection', {
        defaultMessage: '{label} section',
        values: { label },
      })}
      extraAction={
        hasTable ? (
          <EuiPopover
            aria-label={i18n.translate('workflows.executionFlyout.stepDetail.viewMenuAriaLabel', {
              defaultMessage: 'Data view',
            })}
            isOpen={isViewPopoverOpen}
            closePopover={() => setIsViewPopoverOpen(false)}
            anchorPosition="downRight"
            panelPaddingSize="none"
            button={
              <EuiButtonEmpty
                size="xs"
                iconType="chevronSingleDown"
                iconSide="right"
                onClick={() => setIsViewPopoverOpen((v) => !v)}
              >
                {effectiveView === 'table'
                  ? i18n.translate('workflows.executionFlyout.stepDetail.tableView', {
                      defaultMessage: 'Table',
                    })
                  : i18n.translate('workflows.executionFlyout.stepDetail.codeView', {
                      defaultMessage: 'JSON',
                    })}
              </EuiButtonEmpty>
            }
          >
            <EuiContextMenuPanel
              items={[
                <EuiContextMenuItem
                  key="table"
                  icon={effectiveView === 'table' ? 'check' : 'empty'}
                  onClick={() => {
                    setView('table');
                    setIsViewPopoverOpen(false);
                  }}
                >
                  {i18n.translate('workflows.executionFlyout.stepDetail.tableView', {
                    defaultMessage: 'Table',
                  })}
                </EuiContextMenuItem>,
                <EuiContextMenuItem
                  key="code"
                  icon={effectiveView === 'code' ? 'check' : 'empty'}
                  onClick={() => {
                    setView('code');
                    setIsViewPopoverOpen(false);
                  }}
                >
                  {i18n.translate('workflows.executionFlyout.stepDetail.codeView', {
                    defaultMessage: 'JSON',
                  })}
                </EuiContextMenuItem>,
              ]}
            />
          </EuiPopover>
        ) : undefined
      }
    >
      {effectiveView === 'code' ? (
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="m"
          overflowHeight={300}
          isCopyable
          css={`
            & .euiCodeBlock__controls {
              background: transparent;
              top: 4px;
              right: 4px;
              padding: 2px;
            }

            & .euiCodeBlock__controls .euiButtonIcon {
              background: transparent;
            }
          `}
        >
          {JSON.stringify(data ?? null, null, 2)}
        </EuiCodeBlock>
      ) : (
        <div css={{ minWidth: 0 }}>
          <div css={{ marginBottom: euiTheme.size.m }}>
            <EuiFieldSearch
              compressed
              fullWidth
              placeholder={i18n.translate(
                'workflows.executionFlyout.stepDetail.searchPlaceholder',
                { defaultMessage: 'Search fields and values' }
              )}
              aria-label={i18n.translate('workflows.executionFlyout.stepDetail.searchAriaLabel', {
                defaultMessage: 'Search fields and values',
              })}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-test-subj="workflowExecutionStepDataSearch"
            />
          </div>
          <div
            data-test-subj="workflowExecutionStepDataTable"
            css={css`
              min-width: 0;
              width: 100%;
              overflow: hidden;

              .euiTable {
                table-layout: fixed;
                width: 100%;
              }

              .workflowStepDataFieldCol {
                min-width: ${FIELD_COLUMN_MIN_PX}px;
                max-width: ${FIELD_COLUMN_MAX_PX}px;
                width: ${FIELD_COLUMN_MAX_PX}px;
              }

              .workflowStepDataValueCol {
                width: auto;
                overflow: hidden;
              }

              .workflowStepDataValueCol .euiTableCellContent {
                display: block;
                overflow: hidden;
                max-width: 100%;
              }
            `}
          >
            <EuiBasicTable<StepDataTableRow>
              tableCaption={i18n.translate('workflows.executionFlyout.stepDetail.tableCaption', {
                defaultMessage: 'Step data fields',
              })}
              items={paginatedRows}
              columns={tableColumns}
              compressed
              tableLayout="fixed"
              responsiveBreakpoint={false}
              noItemsMessage={emptyTableMessage}
              onChange={onTableChange}
              pagination={
                pageCount > 1
                  ? {
                      pageIndex,
                      pageSize: SECTION_PAGE_SIZE,
                      totalItemCount: filteredRows.length,
                      showPerPageOptions: false,
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}
    </StepDetailAccordionSection>
  );
};

export const WorkflowExecutionFlyout = React.memo<WorkflowExecutionFlyoutProps>(
  ({ executionId, workflowName: workflowNameProp, workflowTags: workflowTagsProp, onClose }) => {
    const { euiTheme } = useEuiTheme();
    const { application, notifications, settings } = useKibana().services;
    const timeZoneSetting: string | undefined = settings.client.get('dateFormat:tz');
    const [activeTab, setActiveTab] = useState<FlyoutTabId>('table');
    const [selectedStepExecutionId, setSelectedStepExecutionId] = useState<string | null>(null);
    const [autoExpandErrorForStepId, setAutoExpandErrorForStepId] = useState<string | null>(null);
    const [errorArrivalPulseStepId, setErrorArrivalPulseStepId] = useState<string | null>(null);
    const autoExpandedForExecutionIdRef = useRef<string | null>(null);

    const { workflowExecution, error } = useWorkflowExecutionPolling(executionId);

    const workflowName =
      workflowNameProp ||
      workflowExecution?.workflowName ||
      workflowExecution?.workflowDefinition?.name ||
      workflowExecution?.workflowId ||
      '';
    const workflowTags = workflowTagsProp ?? workflowExecution?.workflowDefinition?.tags ?? [];

    const { href: executionHref } = useNavigateToExecution({
      workflowId: workflowExecution?.workflowId ?? '',
      executionId,
    });

    const workflowDefinition = workflowExecution?.workflowDefinition ?? null;

    const failedPosition = useMemo(
      () => getFailedStepPosition(workflowExecution, workflowDefinition),
      [workflowExecution, workflowDefinition]
    );

    const runModeInfo = useMemo(
      () => (workflowExecution ? getRunMode(workflowExecution) : null),
      [workflowExecution]
    );

    const scrollToFailedStep = useCallback((stepExecutionId: string) => {
      // Wait for Table tree paint (including tab switch + ancestor expand).
      window.setTimeout(() => {
        const node = document.querySelector(
          `[data-test-subj="workflowStepTreeNode"][data-step-execution-id="${stepExecutionId}"]`
        );
        const errorRegion = node?.querySelector('[data-test-subj="workflowFailedStepErrorPanel"]');
        (errorRegion ?? node)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 0);
    }, []);

    const focusFailedStep = useCallback(
      (stepExecutionId: string) => {
        setActiveTab('table');
        setSelectedStepExecutionId(stepExecutionId);
        setAutoExpandErrorForStepId(stepExecutionId);
        setErrorArrivalPulseStepId(stepExecutionId);
        scrollToFailedStep(stepExecutionId);
      },
      [scrollToFailedStep]
    );

    // Clear the one-shot arrival pulse after the animation window (~1.2s).
    useEffect(() => {
      if (!errorArrivalPulseStepId) return;
      const timer = window.setTimeout(() => {
        setErrorArrivalPulseStepId(null);
      }, 1300);
      return () => window.clearTimeout(timer);
    }, [errorArrivalPulseStepId]);

    // Highlight the failed step in the tree once per execution open (not on tab switches).
    // Do not open the step-detail sub-flyout — that is only for an explicit step click.
    useEffect(() => {
      if (!workflowExecution || !failedPosition) return;
      if (autoExpandedForExecutionIdRef.current === workflowExecution.id) return;
      autoExpandedForExecutionIdRef.current = workflowExecution.id;
      setActiveTab('table');
      setAutoExpandErrorForStepId(failedPosition.step.id);
      setErrorArrivalPulseStepId(failedPosition.step.id);
      scrollToFailedStep(failedPosition.step.id);
    }, [workflowExecution, failedPosition, scrollToFailedStep]);

    const handleShare = useCallback(() => {
      if (!workflowExecution?.workflowId) return;
      const absolute =
        typeof window !== 'undefined' ? `${window.location.origin}${executionHref}` : executionHref;
      copyToClipboard(absolute);
      notifications.toasts.addSuccess(i18nTexts.linkCopied, { toastLifeTimeMs: 2000 });
    }, [executionHref, notifications.toasts, workflowExecution?.workflowId]);

    const handleOpenFailedStepInEditor = useCallback(
      (_stepId: string) => {
        if (!workflowExecution?.workflowId) return;
        application.navigateToApp('workflows', { path: `/${workflowExecution.workflowId}` });
      },
      [application, workflowExecution?.workflowId]
    );

    const selectedLightStep = useMemo(
      () => workflowExecution?.stepExecutions.find((s) => s.id === selectedStepExecutionId) ?? null,
      [workflowExecution?.stepExecutions, selectedStepExecutionId]
    );

    const isPseudoStep =
      selectedStepExecutionId === '__overview' ||
      selectedStepExecutionId === 'trigger' ||
      (selectedStepExecutionId?.startsWith('if-branch:') ?? false) ||
      (selectedStepExecutionId?.startsWith('enter-case-branch:') ?? false) ||
      isIterationPseudoStepId(selectedStepExecutionId);

    const isIterationPseudoStep = isIterationPseudoStepId(selectedStepExecutionId);

    const pseudoStepExecution = useMemo<WorkflowStepExecutionDto | null>(() => {
      if (!workflowExecution) return null;
      if (selectedStepExecutionId === 'trigger') {
        return buildTriggerStepExecutionFromContext(workflowExecution);
      }
      if (selectedStepExecutionId === '__overview') {
        return buildOverviewStepExecutionFromContext(workflowExecution);
      }
      if (selectedStepExecutionId && isIterationPseudoStepId(selectedStepExecutionId)) {
        return buildIterationPseudoStep(selectedStepExecutionId, workflowExecution);
      }
      if (selectedStepExecutionId?.startsWith('if-branch:')) {
        const branchName = selectedStepExecutionId.split(':')[1];
        return {
          id: selectedStepExecutionId,
          stepId: branchName,
          stepType: 'if-branch',
          status: ExecutionStatus.COMPLETED,
          input: undefined,
          output: { result: branchName } as unknown as WorkflowStepExecutionDto['output'],
          scopeStack: [],
          workflowRunId: workflowExecution.id,
          workflowId: workflowExecution.workflowId ?? '',
          startedAt: '',
          globalExecutionIndex: -1,
          stepExecutionIndex: 0,
          topologicalIndex: -1,
        } as WorkflowStepExecutionDto;
      }
      if (selectedStepExecutionId?.startsWith('enter-case-branch:')) {
        const parts = selectedStepExecutionId.split(':');
        const caseName = parts[1];
        const caseStatus = (parts[3] as ExecutionStatus) ?? ExecutionStatus.COMPLETED;
        return {
          id: selectedStepExecutionId,
          stepId: caseName,
          stepType: 'enter-case-branch',
          status: caseStatus,
          input: undefined,
          output: undefined,
          scopeStack: [],
          workflowRunId: workflowExecution.id,
          workflowId: workflowExecution.workflowId ?? '',
          startedAt: '',
          globalExecutionIndex: -1,
          stepExecutionIndex: 0,
          topologicalIndex: -1,
        } as WorkflowStepExecutionDto;
      }
      return null;
    }, [selectedStepExecutionId, workflowExecution]);

    const executionMetadata = useMemo(() => {
      if (!workflowExecution || selectedStepExecutionId !== 'trigger') return null;
      return buildOverviewStepExecutionFromContext(workflowExecution).input;
    }, [selectedStepExecutionId, workflowExecution]);

    const { data: fullStepExecution, isLoading: isLoadingStepData } = useStepExecution(
      executionId,
      isPseudoStep ? undefined : selectedStepExecutionId ?? undefined,
      selectedLightStep?.status
    );
    const { childExecutions, isLoading: isLoadingChildExecutions } =
      useChildWorkflowExecutions(workflowExecution);

    const startedAt = useMemo(
      () => (workflowExecution?.startedAt ? new Date(workflowExecution.startedAt) : null),
      [workflowExecution?.startedAt]
    );
    const formattedDate = formatExecutionTimestamp(workflowExecution?.startedAt, 'header', {
      timeZoneSetting,
    });
    const formattedDateTooltip = formatExecutionTimestamp(workflowExecution?.startedAt, 'tooltip', {
      timeZoneSetting,
    });
    const formattedDuration = useMemo(
      () =>
        workflowExecution?.duration != null ? formatDuration(workflowExecution.duration) : null,
      [workflowExecution?.duration]
    );
    const executedByValue = workflowExecution?.executedBy?.trim() || '';
    const executedByDisplay = executedByValue || '-';

    const activeStepExecution = fullStepExecution ?? pseudoStepExecution;
    const stepName = selectedLightStep?.stepId ?? activeStepExecution?.stepId ?? '';

    const activeStepType = selectedLightStep?.stepType ?? activeStepExecution?.stepType;
    const isForeachOrWhileStep = activeStepType === 'foreach' || activeStepType === 'while';
    const hasStepError = !isPseudoStep && activeStepExecution?.error != null;
    /** Real foreach/while output only — never synthesize child step listings as Output. */
    const stepOutputData = hasStepError ? activeStepExecution?.error : activeStepExecution?.output;

    const definitionConnectorId = useMemo(
      () =>
        findStepConnectorId(
          workflowDefinition,
          selectedLightStep?.stepId ?? activeStepExecution?.stepId ?? ''
        ),
      [workflowDefinition, selectedLightStep?.stepId, activeStepExecution?.stepId]
    );

    const stepAi = useMemo(
      () =>
        normalizeStepAi({
          usage: activeStepExecution?.usage,
          output: activeStepExecution?.output,
          connectorId: definitionConnectorId,
        }),
      [activeStepExecution?.usage, activeStepExecution?.output, definitionConnectorId]
    );

    const { data: fetchedConnector } = useFetchConnector(stepAi?.connectorId);
    const availableConnectors = useAvailableConnectors();
    const aiConnectorName = useMemo(() => {
      const id = stepAi?.connectorId;
      if (!id) return undefined;
      if (fetchedConnector?.name) return fetchedConnector.name;
      for (const typeInfo of Object.values(availableConnectors?.connectorTypes ?? {})) {
        const match = typeInfo.instances.find((inst) => inst.id === id);
        if (match?.name) return match.name;
      }
      return id;
    }, [availableConnectors?.connectorTypes, fetchedConnector?.name, stepAi?.connectorId]);

    // LangChain often omits model from response_metadata; fall back to connector defaultModel.
    const stepAiWithModel = useMemo(() => {
      if (!stepAi) return undefined;
      if (stepAi.model) return stepAi;
      const config = fetchedConnector?.config as { defaultModel?: unknown } | undefined;
      const defaultModel =
        typeof config?.defaultModel === 'string' && config.defaultModel.length > 0
          ? config.defaultModel
          : undefined;
      return defaultModel ? { ...stepAi, model: defaultModel } : stepAi;
    }, [fetchedConnector?.config, stepAi]);

    const showRunModeBadge = runModeInfo?.runMode === 'test' || runModeInfo?.runMode === 'stepTest';
    const showTagsRow = showRunModeBadge || workflowTags.length > 0;
    const stepTestTargetName = runModeInfo?.stepTestTargetName ?? '';

    // Widen the flyout DOM element when the step detail panel is open (FlyoutPanels pattern).
    // Width is a hard constant — content must not flex the panels.
    useLayoutEffect(() => {
      const el = document.querySelector<HTMLElement>(`.${FLYOUT_CLASSNAME}`);
      if (!el) return;
      const totalWidth = Math.min(
        selectedStepExecutionId ? EXECUTION_PANEL_WIDTH + STEP_DETAIL_WIDTH : EXECUTION_PANEL_WIDTH,
        window.innerWidth * 0.9
      );
      el.style.width = `${totalWidth}px`;
      el.style.minWidth = `${totalWidth}px`;
      el.style.maxWidth = `${totalWidth}px`;
    }, [selectedStepExecutionId]);

    return (
      <EuiFlyout
        aria-label={i18n.translate('workflows.executionFlyout.ariaLabel', {
          defaultMessage: 'Execution of {name}',
          values: { name: workflowName },
        })}
        onClose={onClose}
        type="push"
        paddingSize="none"
        hideCloseButton
        className={FLYOUT_CLASSNAME}
        data-test-subj="workflowExecutionFlyout"
      >
        {/* Outer flex row — each column is a visually independent panel */}
        <div css={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
          {/* ── Step detail panel (independent header + scrollable body) ── */}
          {selectedStepExecutionId && (
            <div
              css={{
                width: `${STEP_DETAIL_WIDTH}px`,
                minWidth: `${STEP_DETAIL_WIDTH}px`,
                maxWidth: `${STEP_DETAIL_WIDTH}px`,
                flex: `0 0 ${STEP_DETAIL_WIDTH}px`,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                borderRight: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                overflow: 'hidden',
              }}
            >
              <div
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: euiTheme.size.s,
                  flexShrink: 0,
                  boxSizing: 'border-box',
                  // AppHeader compact: 8px padding + 32px control = 48px.
                  minHeight: 48,
                  paddingBlock: euiTheme.size.s,
                  paddingInline: euiTheme.size.s,
                  borderBottom: euiTheme.border.thin,
                }}
              >
                {(selectedLightStep?.stepType ?? activeStepExecution?.stepType) && (
                  <StepIcon
                    stepType={selectedLightStep?.stepType ?? activeStepExecution?.stepType ?? ''}
                    executionStatus={selectedLightStep?.status ?? activeStepExecution?.status}
                    size="m"
                    css={{ flexShrink: 0 }}
                  />
                )}
                <EuiTitle
                  size="xs"
                  css={{
                    flex: 1,
                    minWidth: 0,
                    marginBottom: 0,
                  }}
                >
                  <h2
                    css={{
                      minWidth: 0,
                      margin: 0,
                      color: euiTheme.colors.title,
                    }}
                  >
                    <EuiTextTruncate text={stepName} />
                  </h2>
                </EuiTitle>
                <EuiToolTip content={i18nTexts.close} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="cross"
                    aria-label={i18nTexts.close}
                    color="text"
                    size="s"
                    iconSize="m"
                    onClick={() => setSelectedStepExecutionId(null)}
                  />
                </EuiToolTip>
              </div>

              <div
                css={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  // No paddingTop — the first accordion already has header padding.
                  paddingInline: euiTheme.size.base,
                  paddingBottom: euiTheme.size.base,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  minWidth: 0,
                }}
              >
                {isLoadingStepData && !isPseudoStep ? (
                  <EuiFlexGroup justifyContent="center">
                    <EuiFlexItem grow={false}>
                      <EuiLoadingSpinner size="l" />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ) : activeStepExecution?.stepType === 'enter-case-branch' ? (
                  <StepDataSection
                    key={`status-${selectedStepExecutionId}`}
                    label={i18n.translate('workflows.executionFlyout.caseBranch.statusLabel', {
                      defaultMessage: 'Status',
                    })}
                    data={{
                      result:
                        activeStepExecution.status === ExecutionStatus.COMPLETED
                          ? i18n.translate('workflows.executionFlyout.caseBranch.taken', {
                              defaultMessage: 'Branch executed',
                            })
                          : i18n.translate('workflows.executionFlyout.caseBranch.skipped', {
                              defaultMessage: 'Branch not taken',
                            }),
                    }}
                  />
                ) : isIterationPseudoStep ? (
                  <>
                    {activeStepExecution?.executionTimeMs != null &&
                      activeStepExecution.executionTimeMs > 0 && (
                        <div css={{ flexShrink: 0 }}>
                          <div
                            css={{
                              paddingTop: euiTheme.size.m,
                              paddingBottom: euiTheme.size.m,
                            }}
                          >
                            <EuiText
                              size="s"
                              color="subdued"
                              data-test-subj="iterationPseudoStepDuration"
                            >
                              {i18n.translate('workflows.executionFlyout.iteration.duration', {
                                defaultMessage: 'Duration: {duration}',
                                values: {
                                  duration: formatDuration(activeStepExecution.executionTimeMs),
                                },
                              })}
                            </EuiText>
                          </div>
                          <EuiHorizontalRule margin="none" />
                        </div>
                      )}
                    {activeStepExecution?.usage && activeStepExecution.usage.totalTokens > 0 && (
                      <TokenUsageBreakdown
                        usage={activeStepExecution.usage}
                        data-test-subj="iterationPseudoStepTokenUsage"
                      />
                    )}
                    <StepDataSection
                      key={`input-${selectedStepExecutionId}`}
                      label={i18n.translate('workflows.executionFlyout.stepDetail.input', {
                        defaultMessage: 'Input',
                      })}
                      data={activeStepExecution?.input}
                    />
                  </>
                ) : (
                  <>
                    {executionMetadata && (
                      <StepDataSection
                        key={`metadata-${selectedStepExecutionId}`}
                        label={i18n.translate('workflows.executionFlyout.stepDetail.metadata', {
                          defaultMessage: 'Metadata',
                        })}
                        data={executionMetadata}
                      />
                    )}
                    {!isPseudoStep && stepAiWithModel && (
                      <AiStepSection ai={stepAiWithModel} connectorName={aiConnectorName} />
                    )}
                    <StepDataSection
                      key={`input-${selectedStepExecutionId}`}
                      label={i18n.translate('workflows.executionFlyout.stepDetail.input', {
                        defaultMessage: 'Input',
                      })}
                      data={activeStepExecution?.input}
                    />
                    {!isPseudoStep &&
                      isForeachOrWhileStep &&
                      activeStepExecution &&
                      workflowExecution?.stepExecutions && (
                        <ForeachIterationsSection
                          foreachStep={activeStepExecution}
                          allStepExecutions={workflowExecution.stepExecutions}
                          selectedId={selectedStepExecutionId}
                          onSelectStep={setSelectedStepExecutionId}
                          executionStatus={workflowExecution.status}
                        />
                      )}
                    {!isPseudoStep &&
                      (hasStepError ? (
                        <StepDataSection
                          key={`error-${selectedStepExecutionId}`}
                          label={i18n.translate('workflows.executionFlyout.stepDetail.error', {
                            defaultMessage: 'Error',
                          })}
                          data={activeStepExecution?.error}
                        />
                      ) : stepOutputData != null ? (
                        <StepDataSection
                          key={`output-${selectedStepExecutionId}`}
                          label={i18n.translate('workflows.executionFlyout.stepDetail.output', {
                            defaultMessage: 'Output',
                          })}
                          data={stepOutputData}
                        />
                      ) : null)}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Execution panel (own EuiFlyoutHeader / Body / Footer) ── */}
          <div
            css={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <EuiFlyoutHeader css={{ padding: 0 }}>
              <EuiFlexGroup
                justifyContent="spaceBetween"
                alignItems="center"
                gutterSize="xs"
                responsive={false}
                css={{
                  // AppHeader compact: 8px padding + 32px size="s" control = 48px.
                  boxSizing: 'border-box',
                  minHeight: 48,
                  paddingBlock: euiTheme.size.s,
                  paddingInline: euiTheme.size.s,
                  borderBottom: euiTheme.border.thin,
                }}
              >
                <EuiButtonEmpty
                  size="s"
                  iconType="undo"
                  color="text"
                  flush="left"
                  onClick={onClose}
                >
                  {i18nTexts.back}
                </EuiButtonEmpty>
                <EuiFlexGroup
                  gutterSize="xs"
                  alignItems="center"
                  justifyContent="flexEnd"
                  responsive={false}
                >
                  <EuiToolTip content={i18nTexts.share} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="share"
                      aria-label={i18nTexts.share}
                      color="text"
                      size="s"
                      iconSize="m"
                      onClick={handleShare}
                      isDisabled={!workflowExecution?.workflowId}
                    />
                  </EuiToolTip>
                  <EuiToolTip content={i18nTexts.close} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="cross"
                      aria-label={i18nTexts.close}
                      color="text"
                      size="s"
                      iconSize="m"
                      onClick={onClose}
                    />
                  </EuiToolTip>
                </EuiFlexGroup>
              </EuiFlexGroup>

              <div
                css={{
                  padding: '16px 16px 8px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div>
                  <EuiTitle size="s">
                    <h2 css={{ wordBreak: 'break-word' }}>{workflowName}</h2>
                  </EuiTitle>
                  {formattedDate && startedAt && (
                    <EuiToolTip content={formattedDateTooltip} position="top">
                      <span tabIndex={0}>
                        <EuiText
                          size="xs"
                          color="subdued"
                          css={{ marginTop: '3px' }}
                          data-test-subj="workflowExecutionFlyoutStartedAt"
                        >
                          {formattedDate}
                          {' ('}
                          <FormattedRelativeEnhanced value={startedAt} />
                          {')'}
                        </EuiText>
                      </span>
                    </EuiToolTip>
                  )}
                </div>

                {showTagsRow && (
                  <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                    {runModeInfo?.runMode === 'test' && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="warning" iconType="flask">
                          {i18nTexts.testRun}
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                    {runModeInfo?.runMode === 'stepTest' && (
                      <EuiFlexItem grow={false}>
                        <EuiToolTip content={stepTestTargetName}>
                          <EuiBadge tabIndex={0} color="warning" iconType="flask">
                            {i18n.translate('workflows.executionFlyout.runMode.stepTest', {
                              defaultMessage: 'Step test: {name}',
                              values: { name: truncateStepName(stepTestTargetName) },
                            })}
                          </EuiBadge>
                        </EuiToolTip>
                      </EuiFlexItem>
                    )}
                    {workflowTags.map((tag) => (
                      <EuiFlexItem grow={false} key={tag}>
                        <EuiBadge color="hollow">{tag}</EuiBadge>
                      </EuiFlexItem>
                    ))}
                  </EuiFlexGroup>
                )}

                {workflowExecution ? (
                  <div
                    css={{
                      border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                      borderRadius: '10px',
                      padding: '12px',
                      minWidth: 0,
                      maxWidth: '100%',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      css={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '16px',
                        minWidth: 0,
                      }}
                    >
                      <div
                        css={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <EuiText
                          size="s"
                          color="subdued"
                          css={{ fontWeight: 500, fontSize: '12px' }}
                        >
                          {i18nTexts.result}
                        </EuiText>
                        <EuiFlexGroup
                          gutterSize="none"
                          css={{ gap: '4px', minWidth: 0 }}
                          alignItems="center"
                          responsive={false}
                        >
                          <EuiFlexItem grow={false}>
                            {getExecutionStatusIcon(euiTheme, workflowExecution.status)}
                          </EuiFlexItem>
                          <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
                            {failedPosition ? (
                              <EuiLink
                                color="danger"
                                data-test-subj="workflowExecutionFlyoutResultLink"
                                onClick={() => {
                                  focusFailedStep(failedPosition.step.id);
                                }}
                                css={{
                                  fontWeight: 600,
                                  fontSize: '12px',
                                  textDecoration: 'underline',
                                }}
                              >
                                {failedPosition.index != null
                                  ? i18n.translate(
                                      'workflows.executionFlyout.result.failedAtStep',
                                      {
                                        defaultMessage: 'Failed at step {n}',
                                        values: {
                                          n: failedPosition.index,
                                        },
                                      }
                                    )
                                  : i18n.translate('workflows.executionFlyout.result.failed', {
                                      defaultMessage: 'Failed',
                                    })}
                              </EuiLink>
                            ) : (
                              <EuiText size="s" css={{ fontWeight: 600, fontSize: '12px' }}>
                                {getStatusLabel(workflowExecution.status)}
                              </EuiText>
                            )}
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </div>

                      <div
                        aria-hidden="true"
                        css={{
                          width: '1px',
                          alignSelf: 'stretch',
                          background: euiTheme.colors.borderBaseSubdued,
                          flexShrink: 0,
                        }}
                      />

                      <div
                        css={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <EuiText
                          size="s"
                          color="subdued"
                          css={{ fontWeight: 500, fontSize: '12px' }}
                        >
                          {i18nTexts.executionTime}
                        </EuiText>
                        <EuiFlexGroup
                          gutterSize="none"
                          css={{ gap: '4px', minWidth: 0 }}
                          alignItems="center"
                          responsive={false}
                        >
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="clock" color="subdued" size="m" aria-hidden={true} />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
                            <EuiText size="s" css={{ fontWeight: 600, fontSize: '12px' }}>
                              {formattedDuration ?? '-'}
                            </EuiText>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </div>

                      <div
                        aria-hidden="true"
                        css={{
                          width: '1px',
                          alignSelf: 'stretch',
                          background: euiTheme.colors.borderBaseSubdued,
                          flexShrink: 0,
                        }}
                      />

                      <div
                        css={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          flex: 1,
                          minWidth: 0,
                        }}
                        data-test-subj="workflowExecutionFlyoutExecutedBy"
                      >
                        <EuiText
                          size="s"
                          color="subdued"
                          css={{ fontWeight: 500, fontSize: '12px' }}
                        >
                          {i18nTexts.executedBy}
                        </EuiText>
                        <EuiFlexGroup
                          gutterSize="xs"
                          alignItems="center"
                          responsive={false}
                          wrap={false}
                          css={{ minWidth: 0, width: '100%' }}
                        >
                          <EuiFlexItem grow css={{ minWidth: 0 }}>
                            <EuiToolTip content={executedByDisplay} display="block">
                              <EuiText
                                tabIndex={0}
                                size="s"
                                css={{
                                  fontWeight: 600,
                                  fontSize: '12px',
                                  minWidth: 0,
                                }}
                              >
                                <EuiTextTruncate text={executedByDisplay} truncation="middle" />
                              </EuiText>
                            </EuiToolTip>
                          </EuiFlexItem>
                          {executedByValue ? (
                            <EuiFlexItem grow={false}>
                              <EuiCopy textToCopy={executedByValue}>
                                {(copy) => {
                                  const copyLabel = i18n.translate(
                                    'workflows.executionFlyout.executedBy.copy',
                                    { defaultMessage: 'Copy executed by' }
                                  );
                                  return (
                                    <EuiToolTip content={copyLabel} disableScreenReaderOutput>
                                      <EuiButtonIcon
                                        iconType="copy"
                                        size="xs"
                                        color="text"
                                        aria-label={copyLabel}
                                        onClick={copy}
                                        data-test-subj="workflowExecutionFlyoutExecutedByCopy"
                                      />
                                    </EuiToolTip>
                                  );
                                }}
                              </EuiCopy>
                            </EuiFlexItem>
                          ) : null}
                        </EuiFlexGroup>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EuiLoadingSpinner size="m" />
                )}
              </div>
            </EuiFlyoutHeader>

            <EuiFlyoutBody
              css={css`
                .euiFlyoutBody__overflowContent {
                  padding: 0;
                }
              `}
            >
              {!workflowExecution && !error ? (
                <EuiFlexGroup
                  justifyContent="center"
                  css={{ padding: `${euiTheme.size.xl} ${euiTheme.size.base} 0` }}
                >
                  <EuiFlexItem grow={false}>
                    <EuiLoadingSpinner size="l" />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ) : (
                <>
                  <EuiTabs css={{ paddingInline: euiTheme.size.base }}>
                    <EuiTab
                      isSelected={activeTab === 'table'}
                      onClick={() => setActiveTab('table')}
                    >
                      {i18nTexts.tableTab}
                    </EuiTab>
                    <EuiTab isSelected={activeTab === 'json'} onClick={() => setActiveTab('json')}>
                      {i18nTexts.jsonTab}
                    </EuiTab>
                  </EuiTabs>
                  {/*
                    No Table-tab step search: findability is auto-scroll, the header
                    failure link, and iteration pins. If step search returns, spec
                    expand-on-match and match handling inside collapsed gaps/attempts
                    first — naive filter breaks the pin/gap model. (Subflyout
                    Input/Output field/value search is separate and required.)
                  */}
                  <div
                    css={{
                      padding: `${euiTheme.size.s} ${euiTheme.size.base} ${euiTheme.size.base}`,
                    }}
                  >
                    {activeTab === 'table' && (
                      <WorkflowStepExecutionTree
                        definition={workflowDefinition}
                        execution={workflowExecution ?? null}
                        error={error}
                        onStepExecutionClick={setSelectedStepExecutionId}
                        selectedId={selectedStepExecutionId}
                        childExecutionsMap={childExecutions}
                        isLoadingChildExecutions={isLoadingChildExecutions}
                        autoExpandErrorForStepId={autoExpandErrorForStepId}
                        errorArrivalPulseStepId={errorArrivalPulseStepId}
                        workflowName={workflowName}
                        onBeforeDiagnose={() => setSelectedStepExecutionId(null)}
                      />
                    )}
                    {activeTab === 'json' && workflowExecution && (
                      <EuiCodeBlock language="json" fontSize="m" isCopyable overflowHeight="100%">
                        {JSON.stringify(workflowExecution, null, 2)}
                      </EuiCodeBlock>
                    )}
                  </div>
                </>
              )}
            </EuiFlyoutBody>

            <EuiFlyoutFooter>
              <div css={{ padding: `${euiTheme.size.m} ${euiTheme.size.base}` }}>
                <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
                  <EuiFlexItem grow={false}>
                    {workflowExecution && (
                      <ExecutionTakeActionSplitButton
                        execution={workflowExecution}
                        failedStepId={failedPosition?.step.stepId}
                        onOpenFailedStepInEditor={handleOpenFailedStepInEditor}
                      />
                    )}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </div>
            </EuiFlyoutFooter>
          </div>
        </div>
      </EuiFlyout>
    );
  }
);
WorkflowExecutionFlyout.displayName = 'WorkflowExecutionFlyout';

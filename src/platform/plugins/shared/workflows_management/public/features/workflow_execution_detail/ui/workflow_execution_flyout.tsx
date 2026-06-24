/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiHorizontalRule,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiLoadingSpinner,
  EuiPagination,
  EuiPopover,
  EuiToken,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { useChildWorkflowExecutions } from '../model/use_child_workflow_executions';
import { useStepExecution } from '../model/use_step_execution';
import {
  buildOverviewStepExecutionFromContext,
  buildTriggerStepExecutionFromContext,
} from './workflow_pseudo_step_context';
import { useWorkflowExecutionPolling } from '../../../entities/workflows/model/use_workflow_execution_polling';
import { formatDuration } from '../../../shared/lib/format_duration';
import { getStatusLabel } from '../../../shared/translations/status_translations';
import { FormattedRelativeEnhanced } from '../../../shared/ui/formatted_relative_enhanced/formatted_relative_enhanced';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';
import { StepIcon } from '../../../shared/ui/step_icons/step_icon';
import { buildForeachOutput } from './step_execution_data_view';
import { ForeachIterationStepList, type ForeachIterationRow } from './foreach_iteration_step_list';
import { WorkflowStepExecutionTree } from './workflow_step_execution_tree';

export interface WorkflowExecutionFlyoutProps {
  executionId: string;
  workflowName: string;
  workflowTags: string[];
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
  takeAction: i18n.translate('workflows.executionFlyout.takeAction', {
    defaultMessage: 'Take action',
  }),
  share: i18n.translate('workflows.executionFlyout.share', { defaultMessage: 'Share' }),
  close: i18n.translate('workflows.executionFlyout.close', { defaultMessage: 'Close' }),
};

const FLYOUT_CLASSNAME = 'workflowExecutionFlyout';
const EXECUTION_PANEL_WIDTH = 480;
const STEP_DETAIL_WIDTH = 480;

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'null';

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
    const fieldType: FieldType = val === null
      ? 'null'
      : Array.isArray(val)
      ? 'array'
      : (typeof val as FieldType);
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

const isTableable = (v: unknown): boolean =>
  v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v) &&
  Object.keys(v as object).length > 0;

interface AiStepStats {
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}

const extractAiStats = (output: unknown): AiStepStats | null => {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return null;
  const o = output as Record<string, unknown>;
  const usage = o.usage as Record<string, unknown> | undefined;
  const model = typeof o.model === 'string' ? o.model : undefined;
  // Cover both snake_case (Bedrock/Claude) and camelCase (OpenAI/agent) field names
  const inputTokens = (
    usage?.input_tokens ?? usage?.inputTokens ?? usage?.prompt_tokens
  ) as number | undefined;
  const outputTokens = (
    usage?.output_tokens ?? usage?.outputTokens ?? usage?.completion_tokens
  ) as number | undefined;
  if (!model && inputTokens === undefined && outputTokens === undefined) return null;
  return { model, inputTokens, outputTokens };
};

const isAiOrAgentStep = (stepType?: string): boolean =>
  (stepType?.startsWith('ai.') ||
    stepType?.startsWith('inference.') ||
    stepType?.startsWith('bedrock.') ||
    stepType?.startsWith('gen-ai.') ||
    stepType?.startsWith('gemini.')) ??
  false;

const AiStatsSection = ({ stats }: { stats: AiStepStats }) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(true);
  const rows: Array<{ icon: string; label: string; value: string }> = [];
  if (stats.model) {
    rows.push({ icon: 'productAgent', label: i18n.translate('workflows.executionFlyout.aiStats.model', { defaultMessage: 'Model used' }), value: stats.model });
  }
  if (stats.inputTokens !== undefined) {
    rows.push({ icon: 'inputOutput', label: i18n.translate('workflows.executionFlyout.aiStats.inputTokens', { defaultMessage: 'Input tokens' }), value: String(stats.inputTokens) });
  }
  if (stats.outputTokens !== undefined) {
    rows.push({ icon: 'inputOutput', label: i18n.translate('workflows.executionFlyout.aiStats.outputTokens', { defaultMessage: 'Output tokens' }), value: String(stats.outputTokens) });
  }
  if (rows.length === 0) return null;
  return (
    <div css={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
      <div css={{ display: 'flex', alignItems: 'center', height: '32px', gap: '4px' }}>
        <EuiButtonIcon
          iconType={isOpen ? 'arrowUp' : 'arrowDown'}
          size="xs"
          color="text"
          aria-label={isOpen ? 'collapse' : 'expand'}
          onClick={() => setIsOpen((v) => !v)}
        />
        <span css={{ fontSize: '14px', fontWeight: 600, color: euiTheme.colors.title }}>
          {i18n.translate('workflows.executionFlyout.aiStats.label', { defaultMessage: 'Model' })}
        </span>
      </div>
      {isOpen && (
        <div
          css={{
            border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
            borderRadius: '6px',
            overflow: 'hidden',
            padding: '0 16px',
          }}
        >
          {rows.map((row, idx) => (
            <div
              key={row.label}
              css={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: idx < rows.length - 1 ? `1px solid ${euiTheme.colors.borderBaseSubdued}` : 'none',
                padding: '8px 0',
                minHeight: '33px',
              }}
            >
              <EuiIcon type={row.icon} size="s" color="subdued" css={{ flexShrink: 0 }} />
              <span css={{ flex: '0 0 50%', fontSize: '12px', color: euiTheme.colors.subduedText }}>
                {row.label}
              </span>
              <span css={{ flex: 1, fontSize: '12px', fontFamily: euiTheme.font.familyCode, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SECTION_PAGE_SIZE = 10;

const StepDataSection = ({ label, data }: { label: string; data: unknown }) => {
  const { euiTheme } = useEuiTheme();
  const [view, setView] = useState<'table' | 'code'>(() => (isTableable(data) ? 'table' : 'code'));
  const [isOpen, setIsOpen] = useState(true);
  const [isViewPopoverOpen, setIsViewPopoverOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageIndex, setPageIndex] = useState(0);

  const hasTable = isTableable(data);
  const effectiveView = hasTable ? view : 'code';

  const rows = useMemo(() => flattenToRows(data), [data]);

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

  return (
    <div css={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
      {/* Section header bar */}
      <div
        css={{
          display: 'flex',
          alignItems: 'center',
          height: '32px',
          gap: '4px',
        }}
      >
        <EuiButtonIcon
          iconType={isOpen ? 'arrowUp' : 'arrowDown'}
          size="xs"
          color="text"
          onClick={() => setIsOpen((v) => !v)}
          aria-label={i18n.translate('workflows.executionFlyout.stepDetail.toggleSection', {
            defaultMessage: '{label} section',
            values: { label },
          })}
        />
        <span css={{ flex: 1, fontSize: '14px', fontWeight: 600 }}>{label}</span>
        {hasTable && (
          <EuiPopover
            isOpen={isViewPopoverOpen}
            closePopover={() => setIsViewPopoverOpen(false)}
            anchorPosition="downRight"
            panelPaddingSize="none"
            button={
              <EuiButtonEmpty
                size="xs"
                iconType="arrowDown"
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
        )}
      </div>

      {/* Section content */}
      {isOpen && (
        <div
          css={{
            border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
            borderRadius: '6px',
            overflow: 'hidden',
          }}
        >
          {effectiveView === 'code' ? (
            <EuiCodeBlock
              language="json"
              fontSize="s"
              transparentBackground
              paddingSize="m"
              overflowHeight={300}
              isCopyable
              css={`
                & .euiCodeBlock__controls {
                  background: ${euiTheme.colors.emptyShade};
                  top: 4px;
                  right: 4px;
                  padding: 2px;
                  border-radius: 4px;
                }
              `}
            >
              {JSON.stringify(data ?? null, null, 2)}
            </EuiCodeBlock>
          ) : (
            <div css={{ padding: '16px' }}>
              {rows.length >= SECTION_PAGE_SIZE && (
                <div css={{ marginBottom: '16px' }}>
                  <EuiFieldSearch
                    compressed
                    fullWidth
                    placeholder={i18n.translate(
                      'workflows.executionFlyout.stepDetail.searchPlaceholder',
                      { defaultMessage: 'Search fields and values' }
                    )}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}
              <div
                css={{
                  display: 'flex',
                  borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                  padding: '7px 8px',
                }}
              >
                <span css={{ flex: '0 0 50%', fontSize: '12px', fontWeight: 600 }}>
                  {i18n.translate('workflows.executionFlyout.stepDetail.fieldColumn', {
                    defaultMessage: 'Field',
                  })}
                </span>
                <span css={{ flex: '0 0 50%', fontSize: '12px', fontWeight: 600 }}>
                  {i18n.translate('workflows.executionFlyout.stepDetail.valueColumn', {
                    defaultMessage: 'Value',
                  })}
                </span>
              </div>
              {filteredRows.length === 0 ? (
                <div
                  css={{
                    padding: '12px 4px',
                    fontSize: '12px',
                    color: euiTheme.colors.subduedText,
                  }}
                >
                  {i18n.translate('workflows.executionFlyout.stepDetail.noData', {
                    defaultMessage: 'No data',
                  })}
                </div>
              ) : (
                <>
                  {paginatedRows.map((row, idx) => (
                    <div
                      key={idx}
                      css={{
                        display: 'flex',
                        borderBottom:
                          idx < paginatedRows.length - 1 || pageCount > 1
                            ? `1px solid ${euiTheme.colors.borderBaseSubdued}`
                            : 'none',
                        padding: '4px 4px',
                        minHeight: '33px',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        css={{
                          flex: '0 0 50%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          overflow: 'hidden',
                          paddingRight: '8px',
                        }}
                      >
                        <EuiToken
                          iconType={fieldTypeToToken[row.fieldType]}
                          size="xs"
                          css={{ flexShrink: 0, width: '12px', height: '12px', margin: 0 }}
                        />
                        <span
                          css={{
                            fontSize: '12px',
                            fontFamily: euiTheme.font.familyCode,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row.field}
                        </span>
                      </span>
                      <span
                        css={{
                          flex: '0 0 50%',
                          fontSize: '12px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                  {pageCount > 1 && (
                    <div css={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 0' }}>
                      <EuiPagination
                        pageCount={pageCount}
                        activePage={pageIndex}
                        onPageClick={setPageIndex}
                        compressed
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const formatExecutionDate = (isoString: string): string | null => {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return null;
  return date
    .toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    .replace(',', ' @');
};

export const WorkflowExecutionFlyout = React.memo<WorkflowExecutionFlyoutProps>(
  ({ executionId, workflowName, workflowTags, onClose }) => {
    const { euiTheme } = useEuiTheme();
    const [activeTab, setActiveTab] = useState<FlyoutTabId>('table');
    const [selectedStepExecutionId, setSelectedStepExecutionId] = useState<string | null>(null);
    const [stepSearchQuery, setStepSearchQuery] = useState('');

    const { workflowExecution, error } = useWorkflowExecutionPolling(executionId);

    const selectedLightStep = useMemo(
      () =>
        workflowExecution?.stepExecutions.find((s) => s.id === selectedStepExecutionId) ?? null,
      [workflowExecution?.stepExecutions, selectedStepExecutionId]
    );

    const isPseudoStep =
      selectedStepExecutionId === '__overview' ||
      selectedStepExecutionId === 'trigger' ||
      (selectedStepExecutionId?.startsWith('if-branch:') ?? false) ||
      (selectedStepExecutionId?.startsWith('enter-case-branch:') ?? false);

    const pseudoStepExecution = useMemo<WorkflowStepExecutionDto | null>(() => {
      if (!workflowExecution) return null;
      if (selectedStepExecutionId === 'trigger') {
        return buildTriggerStepExecutionFromContext(workflowExecution);
      }
      if (selectedStepExecutionId === '__overview') {
        return buildOverviewStepExecutionFromContext(workflowExecution);
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
      isPseudoStep ? undefined : (selectedStepExecutionId ?? undefined),
      selectedLightStep?.status
    );
    const { childExecutions, isLoading: isLoadingChildExecutions } =
      useChildWorkflowExecutions(workflowExecution);

    const workflowDefinition = workflowExecution?.workflowDefinition ?? null;
    const startedAt = useMemo(
      () => (workflowExecution?.startedAt ? new Date(workflowExecution.startedAt) : null),
      [workflowExecution?.startedAt]
    );
    const formattedDate = workflowExecution?.startedAt
      ? formatExecutionDate(workflowExecution.startedAt)
      : null;
    const formattedDuration = useMemo(
      () =>
        workflowExecution?.duration != null ? formatDuration(workflowExecution.duration) : null,
      [workflowExecution?.duration]
    );

    const activeStepExecution = fullStepExecution ?? pseudoStepExecution;
    const stepName = selectedLightStep?.stepId ?? activeStepExecution?.stepId ?? '';

    const activeStepType = selectedLightStep?.stepType ?? activeStepExecution?.stepType;
    const isForeachOrWhileStep = activeStepType === 'foreach' || activeStepType === 'while';
    const stepOutputData =
      activeStepExecution?.error ??
      (isForeachOrWhileStep && activeStepExecution != null && activeStepExecution.output == null
        ? buildForeachOutput(activeStepExecution, workflowExecution?.stepExecutions ?? [])
        : activeStepExecution?.output);

    const foreachRows = useMemo((): ForeachIterationRow[] => {
      const stepId = activeStepExecution?.stepId;
      if (!stepId || !isForeachOrWhileStep || !workflowExecution?.stepExecutions?.length) return [];
      const result: ForeachIterationRow[] = [];
      for (const s of workflowExecution.stepExecutions) {
        const frame = s.scopeStack.find((f) => f.stepId === stepId);
        const iterScope = frame?.nestedScopes.find((sc) => sc.scopeId !== undefined);
        if (!iterScope?.scopeId) continue;
        const iterNum = parseInt(iterScope.scopeId, 10);
        if (isNaN(iterNum)) continue;
        result.push({ iterNum, step: s });
      }
      result.sort(
        (a, b) =>
          a.iterNum - b.iterNum ||
          (a.step.globalExecutionIndex ?? 0) - (b.step.globalExecutionIndex ?? 0)
      );
      return result;
    }, [activeStepExecution?.stepId, isForeachOrWhileStep, workflowExecution?.stepExecutions]);

    // Widen the flyout DOM element when the step detail panel is open (FlyoutPanels pattern).
    useLayoutEffect(() => {
      const el = document.querySelector<HTMLElement>(`.${FLYOUT_CLASSNAME}`);
      if (!el) return;
      const totalWidth = Math.min(
        selectedStepExecutionId
          ? EXECUTION_PANEL_WIDTH + STEP_DETAIL_WIDTH
          : EXECUTION_PANEL_WIDTH,
        window.innerWidth * 0.9
      );
      el.style.minWidth = `${totalWidth}px`;
      el.style.maxWidth = `${totalWidth}px`;
    }, [selectedStepExecutionId]);

    return (
      <EuiFlyout
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
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRight: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                overflow: 'hidden',
              }}
            >
              <div
                css={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                {/* Header row — clean, no separator line */}
                <div
                  css={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexShrink: 0,
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
                  <span
                    css={{
                      flex: 1,
                      fontSize: '16px',
                      fontWeight: 600,
                      color: euiTheme.colors.title,
                      lineHeight: 1.25,
                      wordBreak: 'break-all',
                    }}
                  >
                    {stepName}
                  </span>
                  <EuiButtonIcon
                    iconType="cross"
                    aria-label={i18nTexts.close}
                    color="text"
                    size="s"
                    onClick={() => setSelectedStepExecutionId(null)}
                  />
                </div>

                <EuiHorizontalRule margin="none" css={{ marginLeft: '-16px', marginRight: '-16px', width: 'calc(100% + 32px)' }} />

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
                    <StepDataSection
                      key={`input-${selectedStepExecutionId}`}
                      label={i18n.translate('workflows.executionFlyout.stepDetail.input', {
                        defaultMessage: 'Input',
                      })}
                      data={activeStepExecution?.input}
                    />
                    {!isPseudoStep && (() => {
                      const stepType = selectedLightStep?.stepType ?? activeStepExecution?.stepType;
                      const aiStats = isAiOrAgentStep(stepType)
                        ? extractAiStats(activeStepExecution?.output)
                        : null;
                      return aiStats ? <AiStatsSection stats={aiStats} /> : null;
                    })()}
                    {!isPseudoStep && (
                      isForeachOrWhileStep && foreachRows.length > 0 ? (
                        <ForeachIterationStepList
                          executionId={selectedStepExecutionId ?? ''}
                          rows={foreachRows}
                          onSelectStep={setSelectedStepExecutionId}
                        />
                      ) : (
                        <StepDataSection
                          key={`output-${selectedStepExecutionId}`}
                          label={i18n.translate('workflows.executionFlyout.stepDetail.output', {
                            defaultMessage: 'Output',
                          })}
                          data={stepOutputData}
                        />
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Execution panel (own EuiFlyoutHeader / Body / Footer) ── */}
          <div css={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <EuiFlyoutHeader>
              <EuiFlexGroup
                justifyContent="spaceBetween"
                alignItems="center"
                gutterSize="none"
                responsive={false}
                css={{
                  height: '36px',
                  padding: '0 8px',
                  borderBottom: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
                }}
              >
                <EuiButtonEmpty
                  size="s"
                  iconType="editorUndo"
                  color="text"
                  flush="left"
                  onClick={onClose}
                >
                  {i18nTexts.back}
                </EuiButtonEmpty>
                <EuiFlexGroup
                  gutterSize="none"
                  alignItems="center"
                  justifyContent="flexEnd"
                  responsive={false}
                >
                  <EuiButtonIcon
                    iconType="share"
                    aria-label={i18nTexts.share}
                    color="text"
                    size="s"
                  />
                  <EuiButtonIcon
                    iconType="cross"
                    aria-label={i18nTexts.close}
                    color="text"
                    size="s"
                    onClick={onClose}
                  />
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
                    <EuiText size="xs" color="subdued" css={{ marginTop: '3px' }}>
                      {formattedDate} (<FormattedRelativeEnhanced value={startedAt} />)
                    </EuiText>
                  )}
                </div>

                {workflowTags.length > 0 && (
                  <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
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
                    }}
                  >
                    <div
                      css={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: '16px',
                      }}
                    >
                      <div css={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                        <EuiText
                          size="s"
                          color="subdued"
                          css={{ fontWeight: 500, fontSize: '12px' }}
                        >
                          {i18nTexts.result}
                        </EuiText>
                        <EuiFlexGroup
                          gutterSize="none"
                          css={{ gap: '4px' }}
                          alignItems="center"
                          responsive={false}
                        >
                          <EuiFlexItem grow={false}>
                            {getExecutionStatusIcon(euiTheme, workflowExecution.status)}
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiText size="s" css={{ fontWeight: 600, fontSize: '12px' }}>
                              {getStatusLabel(workflowExecution.status)}
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

                      <div css={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                        <EuiText
                          size="s"
                          color="subdued"
                          css={{ fontWeight: 500, fontSize: '12px' }}
                        >
                          {i18nTexts.executionTime}
                        </EuiText>
                        <EuiFlexGroup
                          gutterSize="none"
                          css={{ gap: '4px' }}
                          alignItems="center"
                          responsive={false}
                        >
                          <EuiFlexItem grow={false}>
                            <EuiIcon type="clock" color="subdued" size="m" />
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
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

                      <div css={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                        <EuiText
                          size="s"
                          color="subdued"
                          css={{ fontWeight: 500, fontSize: '12px' }}
                        >
                          {i18nTexts.executedBy}
                        </EuiText>
                        <EuiText size="s" css={{ fontWeight: 600, fontSize: '12px' }}>
                          {workflowExecution.executedBy ?? '-'}
                        </EuiText>
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
                    <EuiTab
                      isSelected={activeTab === 'json'}
                      onClick={() => setActiveTab('json')}
                    >
                      {i18nTexts.jsonTab}
                    </EuiTab>
                  </EuiTabs>
                  {activeTab === 'table' && (
                    <div css={{ padding: `${euiTheme.size.base} ${euiTheme.size.base} 0` }}>
                      <EuiFieldSearch
                        fullWidth
                        compressed
                        placeholder={i18n.translate(
                          'workflows.executionFlyout.stepSearch.placeholder',
                          { defaultMessage: 'Type text' }
                        )}
                        value={stepSearchQuery}
                        onChange={(e) => setStepSearchQuery(e.target.value)}
                        aria-label={i18n.translate(
                          'workflows.executionFlyout.stepSearch.ariaLabel',
                          { defaultMessage: 'Search steps' }
                        )}
                      />
                    </div>
                  )}
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
                        searchQuery={stepSearchQuery}
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
                    <EuiButton fill size="s" iconSide="right" iconType="arrowDown">
                      {i18nTexts.takeAction}
                    </EuiButton>
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

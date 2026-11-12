/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCode,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import {
  KbnDangerCallout,
  KbnInfoCallout,
  KbnSuccessCallout,
  KbnWarningCallout,
} from '@kbn/ui-callout';
import { getCalledCardContent, getCallerCardContent } from './card_content';
import { DependentsMap } from './dependents_map';
import { getStatusLabel } from './translations';
import { WorkflowLinkCard } from './workflow_link_card';
import { PLUGIN_ID } from '../../../../common';
import type {
  CalledWorkflowImpact,
  DependentsAnalysis,
  ImpactStatus,
} from '../../../../common/lib/workflow_dependents/types';
import { useKibana } from '../../../hooks/use_kibana';
import { WorkflowChangeHistoryMonacoPreview } from '../../change_history/workflow_change_history_monaco_preview';
import type { WorkflowLinksTab } from '../model/workflow_dependents_context';

type StatusFilter = 'all' | ImpactStatus;

const STATUS_FILTER_ORDER: readonly ImpactStatus[] = [
  'breaking',
  'warning',
  'alreadyBroken',
  'unknown',
  'safe',
];

const needsAttention = ({ status }: { status: ImpactStatus }) =>
  status === 'breaking' || status === 'warning';

/** Tracks which cards are expanded; cards that need attention open automatically. */
const useOpenCards = (attentionIds: readonly string[]) => {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const attentionKey = attentionIds.join(',');
  useEffect(() => {
    if (attentionKey) {
      setOpenIds((current) => new Set([...current, ...attentionKey.split(',')]));
    }
  }, [attentionKey]);

  const setOpen = useCallback((id: string, isOpen: boolean) => {
    setOpenIds((current) => {
      const next = new Set(current);
      if (isOpen) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  return { openIds, setOpen };
};

const ChangesSection = ({
  hasUnsavedChanges,
  analysis,
  savedYaml,
  draftYaml,
}: {
  hasUnsavedChanges: boolean;
  analysis: DependentsAnalysis;
  savedYaml?: string;
  draftYaml?: string;
}) => {
  const styles = useMemoCss(componentStyles);
  const { contractChanges, summary } = analysis;

  if (!hasUnsavedChanges) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('workflows.dependents.flyout.noChanges', {
          defaultMessage:
            'When you edit the inputs or outputs, this shows which of these workflows would break before you save.',
        })}
      </EuiText>
    );
  }

  const getVerdict = () => {
    if (summary.breaking > 0) {
      return (
        <KbnDangerCallout
          size="s"
          title={
            summary.indirectBreaking > 0
              ? i18n.translate('workflows.dependents.flyout.breakingWithIndirectTitle', {
                  defaultMessage:
                    'Saving breaks {count, plural, one {# workflow} other {# workflows}} below, plus {indirect, plural, one {# workflow} other {# workflows}} further up the chain that {indirect, plural, one {runs} other {run}} them',
                  values: { count: summary.breaking, indirect: summary.indirectBreaking },
                })
              : i18n.translate('workflows.dependents.flyout.breakingTitle', {
                  defaultMessage:
                    'Saving breaks {count, plural, one {# workflow} other {# workflows}} below',
                  values: { count: summary.breaking },
                })
          }
          data-test-subj="workflowDependentsBreakingCallout"
        />
      );
    }
    if (summary.warning > 0) {
      return (
        <KbnWarningCallout
          size="s"
          title={i18n.translate('workflows.dependents.flyout.warningTitle', {
            defaultMessage:
              'Saving might break {count, plural, one {# workflow} other {# workflows}} below',
            values: { count: summary.warning },
          })}
          data-test-subj="workflowDependentsWarningCallout"
        />
      );
    }
    if (summary.unknown > 0) {
      return (
        <KbnInfoCallout
          size="s"
          title={i18n.translate('workflows.dependents.flyout.uncheckedTitle', {
            defaultMessage:
              'None of the workflows that could be checked break, but {count, plural, one {# workflow computes its} other {# workflows compute their}} inputs while running and can’t be checked',
            values: { count: summary.unknown },
          })}
          data-test-subj="workflowDependentsUncheckedCallout"
        />
      );
    }
    return (
      <KbnSuccessCallout
        size="s"
        title={
          contractChanges.length === 0
            ? i18n.translate('workflows.dependents.flyout.contractUnchanged', {
                defaultMessage:
                  'Your changes don’t touch the inputs or outputs, so nothing here breaks',
              })
            : i18n.translate('workflows.dependents.flyout.noneAffected', {
                defaultMessage: 'None of these workflows break when you save',
              })
        }
        data-test-subj="workflowDependentsContractUnchanged"
      />
    );
  };

  return (
    <>
      {getVerdict()}
      {savedYaml !== undefined && draftYaml !== undefined && (
        <>
          <EuiSpacer size="s" />
          <EuiPanel
            hasBorder
            paddingSize="none"
            css={styles.diff}
            data-test-subj="workflowDependentsChangesDiff"
          >
            <WorkflowChangeHistoryMonacoPreview baselineYaml={savedYaml} targetYaml={draftYaml} />
          </EuiPanel>
        </>
      )}
    </>
  );
};

const SectionTitle = ({ children }: { children: string }) => (
  <>
    <EuiTitle size="xxs">
      <h3>{children}</h3>
    </EuiTitle>
    <EuiSpacer size="s" />
  </>
);

export interface WorkflowDependentsFlyoutProps {
  workflowName: string;
  analysis?: DependentsAnalysis;
  calledWorkflows?: readonly CalledWorkflowImpact[];
  hasUnsavedChanges: boolean;
  savedYaml?: string;
  draftYaml?: string;
  isLoading: boolean;
  isError: boolean;
  /** True while the results shown are for an earlier version of the draft. */
  isUpdating?: boolean;
  /** True when checking the latest draft failed, so the results shown are for an earlier one. */
  isRefreshError?: boolean;
  initialTab: WorkflowLinksTab;
  onRefresh: () => void;
  onClose: () => void;
}

export const WorkflowDependentsFlyout = ({
  workflowName,
  analysis,
  calledWorkflows = [],
  hasUnsavedChanges,
  savedYaml,
  draftYaml,
  isLoading,
  isError,
  isUpdating = false,
  isRefreshError = false,
  initialTab,
  onRefresh,
  onClose,
}: WorkflowDependentsFlyoutProps) => {
  const { application } = useKibana().services;
  const titleId = useGeneratedHtmlId({ prefix: 'workflowDependentsFlyout' });
  const [tab, setTab] = useState<WorkflowLinksTab>(initialTab);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const cardRefs = useRef(new Map<string, HTMLDivElement | null>());

  useEffect(() => setTab(initialTab), [initialTab]);

  const dependents = useMemo(() => analysis?.dependents ?? [], [analysis]);
  const callers = useOpenCards(
    dependents.filter(needsAttention).map(({ workflowId }) => workflowId)
  );
  const called = useOpenCards(
    calledWorkflows.filter(needsAttention).map(({ workflowId }) => workflowId)
  );

  const visibleDependents = useMemo(
    () =>
      statusFilter === 'all'
        ? dependents
        : dependents.filter(({ status }) => status === statusFilter),
    [dependents, statusFilter]
  );

  const filterOptions = useMemo(() => {
    const counts = new Map<ImpactStatus, number>();
    dependents.forEach(({ status }) => counts.set(status, (counts.get(status) ?? 0) + 1));
    return [
      {
        id: 'all',
        label: i18n.translate('workflows.dependents.flyout.filterAll', {
          defaultMessage: 'All ({count})',
          values: { count: dependents.length },
        }),
      },
      ...STATUS_FILTER_ORDER.filter((status) => counts.has(status)).map((status) => ({
        id: status,
        label: `${getStatusLabel(status)} (${counts.get(status)})`,
      })),
    ];
  }, [dependents]);

  const toggleFromMap = useCallback((cards: ReturnType<typeof useOpenCards>, id: string) => {
    const isOpen = cards.openIds.has(id);
    cards.setOpen(id, !isOpen);
    if (!isOpen) {
      setStatusFilter('all');
      requestAnimationFrame(() =>
        cardRefs.current.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      );
    }
  }, []);

  const getHref = (workflowId: string) =>
    application.getUrlForApp(PLUGIN_ID, { path: `/${encodeURIComponent(workflowId)}` });

  const renderUsedBy = (currentAnalysis: DependentsAnalysis) => {
    if (dependents.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="branch"
          titleSize="xs"
          title={
            <h3>
              {i18n.translate('workflows.dependents.flyout.emptyTitle', {
                defaultMessage: 'No workflows run {workflowName}',
                values: { workflowName },
              })}
            </h3>
          }
          body={
            <EuiText size="s">
              {i18n.translate('workflows.dependents.flyout.emptyBody', {
                defaultMessage:
                  'When another workflow runs this one with a workflow.execute step, it shows up here.',
              })}
            </EuiText>
          }
          data-test-subj="workflowDependentsEmpty"
        />
      );
    }

    return (
      <>
        <EuiText size="s">
          {i18n.translate('workflows.dependents.flyout.usedByIntro', {
            defaultMessage:
              'These workflows run {workflowName} as one of their steps. They send it inputs, and some use the outputs it returns.',
            values: { workflowName },
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <SectionTitle>
          {i18n.translate('workflows.dependents.flyout.changesTitle', {
            defaultMessage: 'Your unsaved changes',
          })}
        </SectionTitle>
        <ChangesSection
          hasUnsavedChanges={hasUnsavedChanges}
          analysis={currentAnalysis}
          savedYaml={savedYaml}
          draftYaml={draftYaml}
        />

        <EuiHorizontalRule margin="m" />
        <DependentsMap
          workflowName={workflowName}
          direction="callers"
          links={dependents.map(({ workflowId, workflowName: name, status }) => ({
            id: workflowId,
            name,
            status,
          }))}
          onSelect={(id) => toggleFromMap(callers, id)}
        />
        <EuiSpacer size="m" />
        {filterOptions.length > 2 && (
          <>
            <EuiButtonGroup
              legend={i18n.translate('workflows.dependents.flyout.filterLegend', {
                defaultMessage: 'Filter workflows by result',
              })}
              options={filterOptions}
              idSelected={statusFilter}
              onChange={(id) => setStatusFilter(id as StatusFilter)}
              buttonSize="compressed"
              isFullWidth={false}
              data-test-subj="workflowDependentsFilter"
            />
            <EuiSpacer size="s" />
          </>
        )}
        <EuiFlexGroup direction="column" gutterSize="s">
          {visibleDependents.map((dependent) => (
            <EuiFlexItem key={dependent.workflowId}>
              <WorkflowLinkCard
                ref={(element) => cardRefs.current.set(dependent.workflowId, element)}
                {...getCallerCardContent(dependent, workflowName, hasUnsavedChanges)}
                href={getHref(dependent.workflowId)}
                isOpen={callers.openIds.has(dependent.workflowId)}
                onToggle={(isOpen) => callers.setOpen(dependent.workflowId, isOpen)}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </>
    );
  };

  const renderRuns = () => {
    if (calledWorkflows.length === 0) {
      return (
        <EuiEmptyPrompt
          iconType="branch"
          titleSize="xs"
          title={
            <h3>
              {i18n.translate('workflows.dependents.flyout.runsEmptyTitle', {
                defaultMessage: '{workflowName} doesn’t run other workflows',
                values: { workflowName },
              })}
            </h3>
          }
          body={
            <EuiText size="s">
              {i18n.translate('workflows.dependents.flyout.runsEmptyBody', {
                defaultMessage: 'Add a {stepType} step to run another workflow.',
                values: { stepType: 'workflow.execute' },
              })}
            </EuiText>
          }
          data-test-subj="workflowCalledEmpty"
        />
      );
    }
    return (
      <>
        <EuiText size="s">
          {i18n.translate('workflows.dependents.flyout.runsIntro', {
            defaultMessage:
              '{workflowName} runs these workflows as steps. Each one is checked against its latest saved version, including your unsaved edits here.',
            values: { workflowName },
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <DependentsMap
          workflowName={workflowName}
          direction="called"
          links={calledWorkflows.map(({ workflowId, workflowName: name, status }) => ({
            id: workflowId,
            name: name ?? workflowId,
            status,
          }))}
          onSelect={(id) => toggleFromMap(called, id)}
        />
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="column" gutterSize="s">
          {calledWorkflows.map((calledWorkflow) => (
            <EuiFlexItem key={calledWorkflow.workflowId}>
              <WorkflowLinkCard
                ref={(element) => cardRefs.current.set(calledWorkflow.workflowId, element)}
                {...getCalledCardContent(calledWorkflow)}
                href={calledWorkflow.workflowName ? getHref(calledWorkflow.workflowId) : undefined}
                isOpen={called.openIds.has(calledWorkflow.workflowId)}
                onToggle={(isOpen) => called.setOpen(calledWorkflow.workflowId, isOpen)}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </>
    );
  };

  const renderFreshness = () => {
    if (isRefreshError) {
      return (
        <>
          <KbnWarningCallout
            size="s"
            title={i18n.translate('workflows.dependents.flyout.refreshError', {
              defaultMessage:
                'Couldn’t check your latest changes, so these results are for an earlier version of them',
            })}
            actionProps={{
              primary: {
                children: i18n.translate('workflows.dependents.flyout.retry', {
                  defaultMessage: 'Retry',
                }),
                onClick: onRefresh,
                'data-test-subj': 'workflowDependentsRetry',
              },
            }}
            data-test-subj="workflowDependentsRefreshError"
          />
          <EuiSpacer size="m" />
        </>
      );
    }
    if (isUpdating) {
      return (
        <>
          <EuiFlexGroup
            gutterSize="s"
            alignItems="center"
            responsive={false}
            data-test-subj="workflowDependentsUpdating"
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.translate('workflows.dependents.flyout.updating', {
                  defaultMessage: 'Checking your latest changes…',
                })}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      );
    }
    return null;
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="center">
          <EuiLoadingSpinner size="l" />
        </EuiFlexGroup>
      );
    }
    if (isError || !analysis) {
      return (
        <KbnDangerCallout
          size="s"
          title={i18n.translate('workflows.dependents.flyout.error', {
            defaultMessage: 'Could not load the connected workflows',
          })}
        />
      );
    }
    return (
      <>
        {renderFreshness()}
        {tab === 'usedBy' ? renderUsedBy(analysis) : renderRuns()}
      </>
    );
  };

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      ownFocus={false}
      aria-labelledby={titleId}
      data-test-subj="workflowDependentsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>
            {i18n.translate('workflows.dependents.flyout.title', {
              defaultMessage: 'Connected workflows',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <EuiCode transparentBackground>{workflowName}</EuiCode>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiTabs bottomBorder={false} size="s">
          <EuiTab
            isSelected={tab === 'usedBy'}
            onClick={() => setTab('usedBy')}
            data-test-subj="workflowLinksTabUsedBy"
          >
            {i18n.translate('workflows.dependents.flyout.usedByTab', {
              defaultMessage: 'Used by ({count})',
              values: { count: dependents.length },
            })}
          </EuiTab>
          <EuiTab
            isSelected={tab === 'runs'}
            onClick={() => setTab('runs')}
            data-test-subj="workflowLinksTabRuns"
          >
            {i18n.translate('workflows.dependents.flyout.runsTab', {
              defaultMessage: 'Runs ({count})',
              values: { count: calledWorkflows.length },
            })}
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>{renderBody()}</EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="refresh"
              onClick={onRefresh}
              data-test-subj="workflowDependentsRefresh"
            >
              {i18n.translate('workflows.dependents.flyout.refresh', {
                defaultMessage: 'Refresh',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton onClick={onClose}>
              {i18n.translate('workflows.dependents.flyout.close', { defaultMessage: 'Close' })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const componentStyles = {
  diff: css({
    height: 320,
    overflow: 'hidden',
  }),
};

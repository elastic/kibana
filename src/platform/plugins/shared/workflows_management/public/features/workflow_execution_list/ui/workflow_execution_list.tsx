/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiEmptyPromptProps, UseEuiTheme } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useQuery } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getUserDisplayName } from '@kbn/user-profile-components';
import type { WorkflowExecutionListDto, WorkflowExecutionListItemDto } from '@kbn/workflows';
import { getExecutionHistoryColumns } from './workflow_execution_list_columns';
import {
  type ExecutedByFilterOption,
  ExecutionListFilters,
} from './workflow_execution_list_filters';
import { WorkflowExecutionListFooter } from './workflow_execution_list_footer';
import type { ExecutionListFiltersQueryParams } from './workflow_execution_list_stateful';
import { useKibana } from '../../../hooks/use_kibana';

export interface WorkflowExecutionListProps {
  executions: WorkflowExecutionListDto | null;
  filters: ExecutionListFiltersQueryParams;
  onFiltersChange: (filters: ExecutionListFiltersQueryParams) => void;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  onExecutionClick: (executionId: string) => void;
  selectedId: string | null;
  /** Last opened execution — persists after Back until a different row is opened. */
  lastViewedId: string | null;
  setPaginationObserver: (ref: HTMLDivElement | null) => void;
  showExecutor?: boolean;
  canCancel: boolean;
  isCancelInProgress: boolean;
  onConfirmCancel: () => Promise<void>;
  /** True when more windows can be fetched. */
  hasNextPage?: boolean;
}

const emptyPromptCommonProps: EuiEmptyPromptProps = { titleSize: 'xs', paddingSize: 'm' };
const USER_PROFILES_STALE_TIME = 60 * 1000;
const EMPTY_EXECUTED_BY_USER_PROFILES = new Map<string, UserProfileWithAvatar>();

const profilesToMap = (profiles: UserProfileWithAvatar[]): Map<string, UserProfileWithAvatar> =>
  profiles.reduce<Map<string, UserProfileWithAvatar>>((acc, profile) => {
    acc.set(profile.uid, profile);
    return acc;
  }, new Map<string, UserProfileWithAvatar>());

const getExecutedByLabel = (
  profile?: UserProfileWithAvatar,
  fallbackLabel?: string
): string | undefined => {
  if (!profile?.user) return fallbackLabel;

  return getUserDisplayName(profile.user) || fallbackLabel;
};

const useExecutedByUserProfiles = ({ enabled, uids }: { enabled: boolean; uids: string[] }) => {
  const { userProfile } = useKibana().services;

  return useQuery<UserProfileWithAvatar[], Error, Map<string, UserProfileWithAvatar>>(
    ['workflowsExecutionListExecutedByUserProfiles', ...uids],
    () => userProfile.bulkGet({ uids: new Set(uids), dataPath: 'avatar' }),
    {
      enabled: enabled && uids.length > 0,
      keepPreviousData: true,
      retry: false,
      select: profilesToMap,
      staleTime: USER_PROFILES_STALE_TIME,
    }
  );
};

export const WorkflowExecutionList = ({
  filters,
  onFiltersChange,
  isInitialLoading,
  isLoadingMore,
  error,
  executions,
  onExecutionClick,
  selectedId,
  lastViewedId,
  setPaginationObserver,
  showExecutor = false,
  canCancel,
  isCancelInProgress,
  onConfirmCancel,
  hasNextPage = false,
}: WorkflowExecutionListProps) => {
  const styles = useMemoCss(componentStyles);
  const { euiTheme } = useEuiTheme();
  const { cloud, settings } = useKibana().services;
  const showUnresolvedExecutors = !cloud?.isServerlessEnabled;
  const scrollableContentRef = useRef<HTMLDivElement>(null);
  const timeZoneSetting: string | undefined = settings.client.get('dateFormat:tz');

  const executedByValuesToResolve = useMemo(() => {
    const uniqueUsers = new Set(filters.executedBy);
    executions?.results.forEach((execution) => {
      if (execution.executedBy) {
        uniqueUsers.add(execution.executedBy);
      }
    });
    return Array.from(uniqueUsers).sort();
  }, [executions, filters.executedBy]);

  const { data: executedByUserProfiles = EMPTY_EXECUTED_BY_USER_PROFILES } =
    useExecutedByUserProfiles({
      enabled: showExecutor,
      uids: executedByValuesToResolve,
    });

  const availableExecutedByOptions = useMemo<ExecutedByFilterOption[]>(() => {
    const options = executedByValuesToResolve.flatMap((executedBy) => {
      const label = getExecutedByLabel(
        executedByUserProfiles.get(executedBy),
        showUnresolvedExecutors ? executedBy : undefined
      );

      return label ? [{ label, value: executedBy }] : [];
    });

    const labelCounts = new Map<string, number>();
    for (const { label } of options) {
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    }

    return options.map((option) => {
      if ((labelCounts.get(option.label) ?? 0) < 2) {
        return option;
      }

      const profile = executedByUserProfiles.get(option.value);
      const disambiguator = profile?.user?.username ?? profile?.user?.email ?? option.value;

      if (disambiguator === option.label) {
        return { ...option, label: `${option.label} (${option.value})` };
      }

      return { ...option, label: `${option.label} (${disambiguator})` };
    });
  }, [executedByUserProfiles, executedByValuesToResolve, showUnresolvedExecutors]);

  const columns = useMemo(
    () =>
      getExecutionHistoryColumns({
        euiTheme,
        showExecutor,
        executedByUserProfiles,
        showUnresolvedExecutors,
        timeZoneSetting,
      }),
    [euiTheme, showExecutor, executedByUserProfiles, showUnresolvedExecutors, timeZoneSetting]
  );

  const handleRowClick = useCallback(
    (execution: WorkflowExecutionListItemDto) => {
      onExecutionClick(execution.id);
    },
    [onExecutionClick]
  );

  useEffect(() => {
    if (scrollableContentRef.current) {
      scrollableContentRef.current.scrollTop = 0;
    }
  }, [filters.statuses, filters.executionTypes, filters.executedBy]);

  let content: React.ReactNode = null;

  if (isInitialLoading) {
    content = (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        css={styles.container}
        icon={<EuiLoadingSpinner size="l" />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.workflowExecutionList.loadingExecutions"
              defaultMessage="Loading executions..."
            />
          </h2>
        }
      />
    );
  } else if (error) {
    content = (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        css={styles.container}
        icon={<EuiIcon type="error" size="l" aria-hidden={true} />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.workflowExecutionList.errorLoadingExecutions"
              defaultMessage="Error loading workflow executions"
            />
          </h2>
        }
        body={<EuiText>{error.message}</EuiText>}
      />
    );
  } else if (!executions || !executions.results.length) {
    content = (
      <EuiEmptyPrompt
        {...emptyPromptCommonProps}
        css={styles.container}
        icon={<EuiIcon type="play" size="l" aria-hidden={true} />}
        title={
          <h2>
            <FormattedMessage
              id="workflows.workflowExecutionList.noExecutionsFound"
              defaultMessage="No executions found"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="workflows.workflowExecutionList.noExecutionsFoundDescription"
              defaultMessage="Workflow has not been executed yet."
            />
          </p>
        }
      />
    );
  } else {
    content = (
      <>
        <EuiBasicTable<WorkflowExecutionListItemDto>
          tableCaption={i18n.translate('workflows.workflowExecutionList.tableCaption', {
            defaultMessage: 'Workflow execution history',
          })}
          items={executions.results}
          columns={columns}
          tableLayout="fixed"
          responsiveBreakpoint={false}
          rowProps={(execution) => {
            const isSelected = execution.id === selectedId;
            const isLastViewed = !isSelected && execution.id === lastViewedId;
            return {
              'data-test-subj': 'workflowExecutionListItem',
              'data-selected': isSelected ? 'true' : 'false',
              'data-last-viewed': isLastViewed ? 'true' : 'false',
              'data-started-at': execution.startedAt || 'null',
              'data-executed-by-label':
                showExecutor && showUnresolvedExecutors && execution.executedBy
                  ? execution.executedBy
                  : undefined,
              onClick: () => handleRowClick(execution),
              onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleRowClick(execution);
                }
              },
              tabIndex: 0,
              css: isSelected || isLastViewed ? styles.selectedRow : styles.selectableRow,
            };
          }}
          data-test-subj="workflowExecutionListTable"
        />
        <div
          ref={setPaginationObserver}
          css={css`
            height: 1px;
          `}
        />
        {isLoadingMore && (
          <EuiFlexGroup
            justifyContent="center"
            css={css({ marginTop: '8px' })}
            data-test-subj="workflowExecutionListLoadingMore"
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {!isLoadingMore && !hasNextPage && (
          <EuiText
            size="xs"
            color="subdued"
            textAlign="center"
            css={css({ marginTop: euiTheme.size.s, marginBottom: euiTheme.size.s })}
            data-test-subj="workflowExecutionListEndOfHistory"
            role="status"
            aria-live="polite"
          >
            <FormattedMessage
              id="workflows.workflowExecutionList.endOfHistory"
              defaultMessage="End of execution history"
            />
          </EuiText>
        )}
        <div
          role="status"
          aria-live="polite"
          className="euiScreenReaderOnly"
          data-test-subj="workflowExecutionListA11yStatus"
        >
          {isLoadingMore
            ? i18n.translate('workflows.workflowExecutionList.loadingMoreA11y', {
                defaultMessage: 'Loading more executions',
              })
            : hasNextPage
            ? null
            : i18n.translate('workflows.workflowExecutionList.endOfHistoryA11y', {
                defaultMessage: 'End of execution history',
              })}
        </div>
      </>
    );
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      justifyContent="flexStart"
      css={styles.container}
      data-test-subj="workflowExecutionList"
    >
      <header>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h2>
                <FormattedMessage
                  id="workflows.workflowExecutionList.title"
                  defaultMessage="Execution history"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ExecutionListFilters
              filters={filters}
              onFiltersChange={onFiltersChange}
              availableExecutedByOptions={availableExecutedByOptions}
              showExecutor={showExecutor}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </header>
      <EuiFlexItem grow={true} css={styles.scrollableWrapper}>
        <div ref={scrollableContentRef} css={styles.scrollableContent}>
          {content}
        </div>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <WorkflowExecutionListFooter
          loadedExecutions={executions?.results ?? []}
          canCancel={canCancel}
          isCancelInProgress={isCancelInProgress}
          onConfirmCancel={onConfirmCancel}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const componentStyles = {
  container: ({ euiTheme }: UseEuiTheme) =>
    css({
      padding: euiTheme.size.m,
      height: '100%',
      overflow: 'hidden',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      // Keep the table inside the narrow panel; never introduce horizontal scroll.
      '& [data-test-subj="workflowExecutionListTable"]': {
        tableLayout: 'fixed',
        width: '100%',
      },
      '& [data-test-subj="workflowExecutionListTable"] table': {
        tableLayout: 'fixed',
        width: '100%',
      },
      // Fixed layout + overflow so the flexible Executed by column can middle-truncate.
      '& [data-test-subj="workflowExecutionListTable"] .euiTableRowCell': {
        overflow: 'hidden',
      },
      '& [data-test-subj="workflowExecutionListTable"] .euiTableCellContent': {
        maxWidth: '100%',
        overflow: 'hidden',
        // UserAvatar `s` (24px) is EUI's smallest; extra cell padding gives it room.
        paddingBlock: euiTheme.size.base,
      },
      '& [data-test-subj="workflowExecutionListTable"] .euiTableCellContent__text': {
        minWidth: 0,
        flex: '1 1 0%',
        overflow: 'hidden',
      },
    }),
  scrollableWrapper: css({
    minHeight: 0,
  }),
  scrollableContent: css({
    height: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
  }),
  selectedRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveSelect,
      cursor: 'pointer',
    }),
  selectableRow: ({ euiTheme }: UseEuiTheme) =>
    css({
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: euiTheme.colors.backgroundBaseInteractiveHover,
      },
    }),
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSelectableOption, UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiNotificationBadge,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useMemo, useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { ExecutionStatus, ExecutionType } from '@kbn/workflows';
import { getStatusLabel } from '../../../shared/translations';

export interface ExecutedByFilterOption {
  label: string;
  value: string;
}

export interface ExecutionListFiltersProps {
  filters: {
    statuses: ExecutionStatus[];
    executionTypes: ExecutionType[];
    executedBy: string[];
  };
  onFiltersChange: (filters: {
    statuses: ExecutionStatus[];
    executionTypes: ExecutionType[];
    executedBy: string[];
  }) => void;
  availableExecutedByOptions?: ExecutedByFilterOption[];
  showExecutor?: boolean;
}

type StatusFilterOption = EuiSelectableOption<{ statuses: ExecutionStatus[] }>;

const EQUAL_HEIGHT_OFFSET = 2; // to avoid changes in the header's height after "Clear all" button appears

const getExecutionFilterStatusLabel = (status: ExecutionStatus): string => {
  switch (status) {
    case ExecutionStatus.WAITING_FOR_INPUT:
      return i18n.translate(
        'workflows.workflowExecutionList.filterIconButton.waitingForInputLabel',
        {
          defaultMessage: 'Waiting for input',
        }
      );
    case ExecutionStatus.WAITING_FOR_CHILD:
      return i18n.translate(
        'workflows.workflowExecutionList.filterIconButton.waitingForChildLabel',
        {
          defaultMessage: 'Waiting for child workflow',
        }
      );
    default:
      return getStatusLabel(status);
  }
};

const buildStatusFilterOptions = (selected: ExecutionStatus[]): StatusFilterOption[] => {
  const statusesByLabel = new Map<string, ExecutionStatus[]>();

  for (const status of Object.values(ExecutionStatus)) {
    const label = getExecutionFilterStatusLabel(status);
    const group = statusesByLabel.get(label);
    if (group) {
      group.push(status);
    } else {
      statusesByLabel.set(label, [status]);
    }
  }

  return Array.from(statusesByLabel.entries()).map(([label, statuses]) => ({
    label,
    key: statuses[0],
    statuses,
    checked: statuses.some((status) => selected.includes(status)) ? ('on' as const) : undefined,
  }));
};

const buildRunTypeFilterOptions = (
  selected: ExecutionType[]
): Array<EuiSelectableOption<{ executionType: ExecutionType }>> => [
  {
    key: ExecutionType.PRODUCTION,
    label: i18n.translate('workflows.workflowExecutionList.filterIconButton.productionLabel', {
      defaultMessage: 'Production',
    }),
    executionType: ExecutionType.PRODUCTION,
    checked: selected.includes(ExecutionType.PRODUCTION) ? ('on' as const) : undefined,
  },
  {
    key: ExecutionType.TEST,
    label: i18n.translate('workflows.workflowExecutionList.filterIconButton.testLabel', {
      defaultMessage: 'Test run',
    }),
    executionType: ExecutionType.TEST,
    checked: selected.includes(ExecutionType.TEST) ? ('on' as const) : undefined,
  },
];

const buildExecutedByFilterOptions = ({
  availableExecutedByOptions,
  selected,
  searchValue,
}: {
  availableExecutedByOptions: ExecutedByFilterOption[];
  selected: string[];
  searchValue: string;
}): EuiSelectableOption[] => {
  const optionsByValue = new Map<string, EuiSelectableOption>();

  for (const { label, value } of availableExecutedByOptions) {
    optionsByValue.set(value, {
      label,
      key: value,
      checked: selected.includes(value) ? ('on' as const) : undefined,
    });
  }

  for (const value of selected) {
    if (!optionsByValue.has(value)) {
      optionsByValue.set(value, {
        label: value,
        key: value,
        checked: 'on',
      });
    }
  }

  const trimmedSearch = searchValue.trim();
  if (
    trimmedSearch &&
    !Array.from(optionsByValue.values()).some(
      (option) =>
        option.key === trimmedSearch ||
        option.label.localeCompare(trimmedSearch, undefined, { sensitivity: 'accent' }) === 0
    )
  ) {
    optionsByValue.set(trimmedSearch, {
      label: trimmedSearch,
      key: trimmedSearch,
      checked: undefined,
    });
  }

  return Array.from(optionsByValue.values());
};

export function ExecutionListFilters({
  filters,
  onFiltersChange,
  availableExecutedByOptions = [],
  showExecutor = false,
}: ExecutionListFiltersProps) {
  const styles = useMemoCss(componentStyles);

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'filterGroupPopover',
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [executedBySearchValue, setExecutedBySearchValue] = useState('');
  const [statusOptions, setStatusOptions] = useState(() =>
    buildStatusFilterOptions(filters.statuses)
  );
  const [runTypeOptions, setRunTypeOptions] = useState(() =>
    buildRunTypeFilterOptions(filters.executionTypes)
  );

  useEffect(() => {
    setStatusOptions(buildStatusFilterOptions(filters.statuses));
  }, [filters.statuses]);

  useEffect(() => {
    setRunTypeOptions(buildRunTypeFilterOptions(filters.executionTypes));
  }, [filters.executionTypes]);

  const executedByOptions = useMemo(
    () =>
      buildExecutedByFilterOptions({
        availableExecutedByOptions,
        selected: filters.executedBy,
        searchValue: executedBySearchValue,
      }),
    [availableExecutedByOptions, filters.executedBy, executedBySearchValue]
  );

  const handleStatusChange = (newOptions: StatusFilterOption[]) => {
    setStatusOptions(newOptions);
    onFiltersChange({
      statuses: newOptions
        .filter((item) => item.checked === 'on')
        .flatMap((item) => item.statuses ?? []),
      executionTypes: filters.executionTypes,
      executedBy: filters.executedBy,
    });
  };

  const handleRunTypeChange = (
    newOptions: Array<EuiSelectableOption<{ executionType: ExecutionType }>>
  ) => {
    setRunTypeOptions(newOptions);
    onFiltersChange({
      statuses: filters.statuses,
      executionTypes: newOptions
        .filter((item) => item.checked === 'on' && item.key)
        .map((item) => item.key as ExecutionType),
      executedBy: filters.executedBy,
    });
  };

  const handleExecutedByChange = (newOptions: EuiSelectableOption[]) => {
    onFiltersChange({
      statuses: filters.statuses,
      executionTypes: filters.executionTypes,
      executedBy: newOptions
        .filter((item) => item.checked === 'on' && item.key)
        .map((item) => item.key as string),
    });
  };

  const clearAll = () => {
    setStatusOptions(statusOptions.map((item) => ({ ...item, checked: undefined })));
    setRunTypeOptions(runTypeOptions.map((item) => ({ ...item, checked: undefined })));
    setExecutedBySearchValue('');
    onFiltersChange({
      statuses: [],
      executionTypes: [],
      executedBy: showExecutor ? [] : filters.executedBy,
    });
  };

  const numActiveFilters =
    statusOptions.filter((item) => item.checked === 'on').length +
    runTypeOptions.filter((item) => item.checked === 'on').length +
    (showExecutor ? filters.executedBy.length : 0);

  const hasActiveFilters = numActiveFilters > 0;

  return (
    <EuiPopover
      id={filterGroupPopoverId}
      aria-label={i18n.translate('workflows.workflowExecutionList.filterPopoverAriaLabel', {
        defaultMessage: 'Filter executions',
      })}
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(false);
        setExecutedBySearchValue('');
      }}
      button={
        <EuiButton
          size="s"
          color="text"
          iconType="filter"
          minWidth={false}
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
          }}
          isSelected={isPopoverOpen}
          aria-label={i18n.translate('workflows.workflowExecutionList.filterIconButtonAriaLabel', {
            defaultMessage: 'Filter executions',
          })}
          data-test-subj="workflowExecutionListFilterButton"
          css={styles.filterButton}
        >
          {hasActiveFilters ? (
            <EuiNotificationBadge color="accent" data-test-subj="workflowExecutionListFilterCount">
              {numActiveFilters}
            </EuiNotificationBadge>
          ) : null}
        </EuiButton>
      }
      panelPaddingSize="none"
      hasArrow={false}
      panelStyle={{ width: '280px' }}
      css={styles.popover}
    >
      <EuiPopoverTitle paddingSize="s">
        <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
          <EuiFlexItem css={styles.popoverTitle}>
            <EuiTitle size="xxs">
              <h5 className="eui-textBreakWord">
                {i18n.translate('workflows.workflowExecutionList.filterIconButton.title', {
                  defaultMessage: 'Filter executions',
                })}
              </h5>
            </EuiTitle>
          </EuiFlexItem>
          {hasActiveFilters && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                onClick={clearAll}
                data-test-subj={`${filterGroupPopoverId}ClearAll`}
              >
                {i18n.translate('workflows.workflowExecutionList.filterIconButton.clearAllLink', {
                  defaultMessage: 'Clear all',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPopoverTitle>

      <div css={styles.section}>
        <EuiText size="xs" color="subdued" css={styles.sectionTitle}>
          <strong>
            {i18n.translate('workflows.workflowExecutionList.filterIconButton.statusLabel', {
              defaultMessage: 'Status',
            })}
          </strong>
        </EuiText>
        <EuiSelectable
          aria-label={i18n.translate(
            'workflows.workflowExecutionList.filterIconButton.statusAriaLabel',
            {
              defaultMessage: 'Filter by status',
            }
          )}
          options={statusOptions}
          onChange={handleStatusChange}
          listProps={{ isVirtualized: false, bordered: false }}
        >
          {(list) => list}
        </EuiSelectable>
      </div>

      <EuiHorizontalRule margin="none" />

      <div css={styles.section}>
        <EuiText size="xs" color="subdued" css={styles.sectionTitle}>
          <strong>
            {i18n.translate('workflows.workflowExecutionList.filterIconButton.executionTypeLabel', {
              defaultMessage: 'Run type',
            })}
          </strong>
        </EuiText>
        <EuiSelectable
          aria-label={i18n.translate(
            'workflows.workflowExecutionList.filterIconButton.runTypeAriaLabel',
            {
              defaultMessage: 'Filter by run type',
            }
          )}
          options={runTypeOptions}
          onChange={handleRunTypeChange}
          listProps={{ isVirtualized: false, bordered: false }}
        >
          {(list) => list}
        </EuiSelectable>
      </div>

      {showExecutor && (
        <>
          <EuiHorizontalRule margin="none" />
          <div css={styles.section}>
            <EuiText size="xs" color="subdued" css={styles.sectionTitle}>
              <strong>
                {i18n.translate(
                  'workflows.workflowExecutionList.filterIconButton.executedByLabel',
                  {
                    defaultMessage: 'Executed by',
                  }
                )}
              </strong>
            </EuiText>
            <EuiSelectable
              aria-label={i18n.translate(
                'workflows.workflowExecutionList.filterIconButton.executedByAriaLabel',
                {
                  defaultMessage: 'Filter by executor',
                }
              )}
              options={executedByOptions}
              onChange={handleExecutedByChange}
              searchable
              searchProps={{
                compressed: true,
                placeholder: i18n.translate(
                  'workflows.workflowExecutionList.filterIconButton.executedByPlaceholder',
                  {
                    defaultMessage: 'Filter by user',
                  }
                ),
                value: executedBySearchValue,
                onChange: (value) => setExecutedBySearchValue(value),
                'data-test-subj': 'workflowExecutionListExecutedBySearch',
              }}
              listProps={{ isVirtualized: false, bordered: false }}
            >
              {(list, search) => (
                <>
                  <div css={styles.executedBySearch}>{search}</div>
                  {list}
                </>
              )}
            </EuiSelectable>
          </div>
        </>
      )}
    </EuiPopover>
  );
}

const componentStyles = {
  popover: css`
    & .euiPopover__anchor {
      display: inline-flex;
    }
  `,
  popoverTitle: ({ euiTheme }: UseEuiTheme) => css`
    padding: ${EQUAL_HEIGHT_OFFSET}px ${euiTheme.size.s};
  `,
  filterButton: ({ euiTheme }: UseEuiTheme) => css`
    /* Keep the default EuiButton border; tighten content spacing for icon + badge. */
    & .euiButton__content {
      gap: ${euiTheme.size.xs};
    }

    & .euiButton__text {
      line-height: 1;
    }
  `,
  section: ({ euiTheme }: UseEuiTheme) => css`
    padding-block: ${euiTheme.size.s};
  `,
  sectionTitle: ({ euiTheme }: UseEuiTheme) => css`
    padding-inline: ${euiTheme.size.m};
    padding-bottom: ${euiTheme.size.xs};
  `,
  executedBySearch: ({ euiTheme }: UseEuiTheme) => css`
    padding-inline: ${euiTheme.size.s};
    padding-bottom: ${euiTheme.size.xs};
  `,
};

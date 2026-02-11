/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiComboBoxOptionOption, EuiSelectableOption, UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiComboBox,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import { ExecutionStatus, ExecutionType } from '@kbn/workflows';
import { getStatusLabel } from '../../../shared/translations';

interface ExecutionListFiltersProps {
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
  availableExecutedByOptions?: string[];
}

interface ExecutionListFiltersItem {
  group: 'status' | 'executionType';
}

const EQUAL_HEIGHT_OFFSET = 2; // to avoid changes in the header's height after "Clear all" button appears

export function ExecutionListFilters({
  filters,
  onFiltersChange,
  availableExecutedByOptions = [],
}: ExecutionListFiltersProps) {
  const styles = useMemoCss(componentStyles);

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'filterGroupPopover',
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [items, setItems] = useState<EuiSelectableOption<ExecutionListFiltersItem>[]>([
    {
      label: i18n.translate('workflows.workflowExecutionList.filterIconButton.statusLabel', {
        defaultMessage: 'Status',
      }),
      isGroupLabel: true,
      group: 'status' as const,
    },
    ...Object.values(ExecutionStatus).map((status) => ({
      label: getStatusLabel(status),
      key: status,
      checked: filters.statuses.includes(status) ? ('on' as const) : undefined,
      group: 'status' as const,
    })),
    {
      label: i18n.translate('workflows.workflowExecutionList.filterIconButton.executionTypeLabel', {
        defaultMessage: 'Execution type',
      }),
      isGroupLabel: true,
      group: 'executionType' as const,
    },
    {
      key: ExecutionType.TEST,
      label: i18n.translate('workflows.workflowExecutionList.filterIconButton.testLabel', {
        defaultMessage: 'test',
      }),
      checked: filters.executionTypes.includes(ExecutionType.TEST) ? ('on' as const) : undefined,
      group: 'executionType' as const,
    },
    {
      key: ExecutionType.PRODUCTION,
      label: i18n.translate('workflows.workflowExecutionList.filterIconButton.productionLabel', {
        defaultMessage: 'production',
      }),
      checked: filters.executionTypes.includes(ExecutionType.PRODUCTION)
        ? ('on' as const)
        : undefined,
      group: 'executionType' as const,
    },
  ]);

  const handleSelectableOptionsChange = (
    newOptions: EuiSelectableOption<ExecutionListFiltersItem>[]
  ) => {
    setItems(newOptions);
    onFiltersChange({
      statuses: newOptions
        .filter((item) => item.checked === 'on' && item.key && item.group === 'status')
        .map((item) => item.key as ExecutionStatus),
      executionTypes: newOptions
        .filter((item) => item.checked === 'on' && item.key && item.group === 'executionType')
        .map((item) => item.key as ExecutionType),
      executedBy: filters.executedBy,
    });
  };

  const handleExecutedByChange = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    const executedByValues = selectedOptions.map((option) => option.label);
    onFiltersChange({
      statuses: filters.statuses,
      executionTypes: filters.executionTypes,
      executedBy: executedByValues,
    });
  };

  const clearAll = () => {
    setItems(items.map((item) => ({ ...item, checked: undefined })));
    onFiltersChange({
      statuses: [],
      executionTypes: [],
      executedBy: [],
    });
  };

  const numActiveFilters =
    items.filter((item) => item.checked === 'on').length + filters.executedBy.length;

  return (
    <EuiFilterGroup compressed css={styles.filterGroup}>
      <EuiPopover
        id={filterGroupPopoverId}
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        button={
          <EuiFilterButton
            onClick={() => {
              setIsPopoverOpen(!isPopoverOpen);
            }}
            color="text"
            badgeColor={numActiveFilters > 0 ? 'accent' : 'subdued'}
            isSelected={isPopoverOpen}
            numFilters={numActiveFilters}
            hasActiveFilters={!!numActiveFilters}
            numActiveFilters={numActiveFilters}
            aria-label={i18n.translate(
              'workflows.workflowExecutionList.filterIconButtonAriaLabel',
              {
                defaultMessage: 'Filter executions',
              }
            )}
            css={styles.filterButtonStyle}
          >
            <EuiIcon type="filter" />
          </EuiFilterButton>
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
            {numActiveFilters > 0 && (
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
        <EuiSelectable
          aria-label={i18n.translate('workflows.workflowExecutionList.filterIconButton.ariaLabel', {
            defaultMessage: 'Filter executions',
          })}
          options={items}
          onChange={handleSelectableOptionsChange}
        >
          {(list) => list}
        </EuiSelectable>
        <div css={styles.comboBoxContainer}>
          <EuiSpacer size="s" />
          <EuiText size="xs" color="subdued">
            <strong>
              {i18n.translate('workflows.workflowExecutionList.filterIconButton.executedByLabel', {
                defaultMessage: 'Executed by',
              })}
            </strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiComboBox
            placeholder={i18n.translate(
              'workflows.workflowExecutionList.filterIconButton.executedByPlaceholder',
              {
                defaultMessage: 'Filter by username',
              }
            )}
            options={availableExecutedByOptions.map((user) => ({ label: user }))}
            selectedOptions={filters.executedBy.map((user) => ({ label: user }))}
            onChange={handleExecutedByChange}
            onCreateOption={(searchValue) => {
              const newOption = { label: searchValue };
              handleExecutedByChange([
                ...filters.executedBy.map((user) => ({ label: user })),
                newOption,
              ]);
            }}
            isClearable={true}
            compressed
            fullWidth
          />
          <EuiSpacer size="s" />
        </div>
      </EuiPopover>
    </EuiFilterGroup>
  );
}

const componentStyles = {
  popover: css`
    & .euiFilterButton__wrapper {
      min-inline-size: 64px;

      &::before,
      &::after {
        display: none !important;
      }
    }
  `,
  popoverTitle: ({ euiTheme }: UseEuiTheme) => css`
    padding: ${EQUAL_HEIGHT_OFFSET}px ${euiTheme.size.s};
  `,
  filterGroup: css({
    backgroundColor: 'transparent',
    '&::after': {
      border: 'none',
    },
    '&::before': {
      border: 'none',
    },
  }),
  filterButtonStyle: css`
    padding: 0;

    &,
    & .euiFilterButton__text {
      min-width: 0;
      line-height: 1;
    }
  `,
  comboBoxContainer: ({ euiTheme }: UseEuiTheme) => css`
    padding: ${euiTheme.size.s};
    border-top: ${euiTheme.border.thin};
  `,
};

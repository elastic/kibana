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
  EuiFilterButton,
  EuiFilterGroup,
  EuiPopover,
  EuiSelectable,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExecutionType } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import React, { useState } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { css } from '@emotion/react';
import { getStatusLabel } from '../../../shared/translations';

interface ExecutionListFiltersProps {
  filters: {
    status: ExecutionStatus[];
    executionType: ExecutionType[];
  };
  onFiltersChange: (filters: { status: ExecutionStatus[]; executionType: ExecutionType[] }) => void;
}

export function ExecutionListFilters({ filters, onFiltersChange }: ExecutionListFiltersProps) {
  const styles = useMemoCss(componentStyles);

  const filterGroupPopoverId = useGeneratedHtmlId({
    prefix: 'filterGroupPopover',
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [items, setItems] = useState<EuiSelectableOption[]>([
    {
      label: i18n.translate('workflows.workflowExecutionList.filterIconButton.statusLabel', {
        defaultMessage: 'Status',
      }),
      isGroupLabel: true,
    },
    ...Object.values(ExecutionStatus).map((status) => ({
      label: getStatusLabel(status),
      key: status,
      checked: filters.status.includes(status) ? ('on' as const) : undefined,
    })),
    {
      label: i18n.translate('workflows.workflowExecutionList.filterIconButton.executionTypeLabel', {
        defaultMessage: 'Execution type',
      }),
      isGroupLabel: true,
    },
    {
      label: i18n.translate('workflows.workflowExecutionList.filterIconButton.testLabel', {
        defaultMessage: 'test',
      }),
      checked: filters.executionType.includes(ExecutionType.TEST) ? ('on' as const) : undefined,
    },
    {
      label: i18n.translate('workflows.workflowExecutionList.filterIconButton.productionLabel', {
        defaultMessage: 'production',
      }),
      checked: filters.executionType.includes(ExecutionType.PRODUCTION)
        ? ('on' as const)
        : undefined,
    },
  ]);

  const handleSelectableOptionsChange = (newOptions: EuiSelectableOption[]) => {
    setItems(newOptions);
    onFiltersChange({
      status: newOptions
        .filter((item) => item.checked === 'on')
        .map((item) => item.key as ExecutionStatus),
      executionType: newOptions
        .filter((item) => item.checked === 'on')
        .map((item) => item.key as ExecutionType),
    });
  };

  return (
    <EuiFilterGroup compressed css={styles.filterGroup}>
      <EuiPopover
        id={filterGroupPopoverId}
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        button={
          <EuiFilterButton
            iconType="filter"
            onClick={() => {
              setIsPopoverOpen(!isPopoverOpen);
            }}
            color="text"
            badgeColor="subdued"
            isSelected={isPopoverOpen}
            numFilters={items.filter((item) => item.checked !== 'off').length}
            hasActiveFilters={!!items.find((item) => item.checked === 'on')}
            numActiveFilters={items.filter((item) => item.checked === 'on').length}
            aria-label={i18n.translate(
              'workflows.workflowExecutionList.filterIconButtonAriaLabel',
              {
                defaultMessage: 'Filter executions',
              }
            )}
          >
            {i18n.translate('workflows.workflowExecutionList.filterIconButton.label', {
              defaultMessage: 'Filter',
            })}
          </EuiFilterButton>
        }
        panelPaddingSize="none"
        hasArrow={false}
        panelStyle={{ width: '280px' }}
      >
        <EuiSelectable
          aria-label={i18n.translate('workflows.workflowExecutionList.filterIconButton.ariaLabel', {
            defaultMessage: 'Filter executions',
          })}
          options={items}
          onChange={handleSelectableOptionsChange}
        >
          {(list) => list}
        </EuiSelectable>
      </EuiPopover>
    </EuiFilterGroup>
  );
}

const componentStyles = {
  filterGroup: ({ euiTheme }: UseEuiTheme) =>
    css({
      backgroundColor: 'transparent',
      '&:before': {
        border: 'none',
      },
    }),
};

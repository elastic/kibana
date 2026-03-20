/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiPopover,
  EuiContextMenu,
  EuiToolTip,
  EuiIcon,
  EuiNotificationBadge,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Filter } from '@kbn/es-query';
import {
  enableFilter,
  disableFilter,
  toggleFilterNegated,
  pinFilter,
  unpinFilter,
} from '@kbn/es-query';

export interface FilterCountButtonProps {
  filters: Filter[];
  onFiltersUpdated?: (filters: Filter[]) => void;
  onToggleFilterBarCollapsed?: () => void;
  onAddFilter?: () => void;
  isFilterBarCollapsed?: boolean;
  isDisabled?: boolean;
}

const strings = {
  getButtonLabel: (count: number) =>
    i18n.translate('unifiedSearch.filter.filterCountButton.label', {
      defaultMessage: '{count, plural, one {# filter} other {# filters}}',
      values: { count },
    }),
  getApplyToAllLabel: () =>
    i18n.translate('unifiedSearch.filter.filterCountButton.applyToAll', {
      defaultMessage: 'Apply to all',
    }),
  getEnableAllLabel: () =>
    i18n.translate('unifiedSearch.filter.filterCountButton.enableAll', {
      defaultMessage: 'Enable all',
    }),
  getDisableAllLabel: () =>
    i18n.translate('unifiedSearch.filter.filterCountButton.disableAll', {
      defaultMessage: 'Disable all',
    }),
  getInvertInclusionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterCountButton.invertInclusion', {
      defaultMessage: 'Invert inclusion',
    }),
  getPinAllLabel: () =>
    i18n.translate('unifiedSearch.filter.filterCountButton.pinAll', {
      defaultMessage: 'Pin all',
    }),
  getUnpinAllLabel: () =>
    i18n.translate('unifiedSearch.filter.filterCountButton.unpinAll', {
      defaultMessage: 'Unpin all',
    }),
  getClearAllLabel: () =>
    i18n.translate('unifiedSearch.filter.filterCountButton.clearAll', {
      defaultMessage: 'Clear all',
    }),
  getCollapseLabel: () =>
    i18n.translate('unifiedSearch.filter.filterCountButton.collapse', {
      defaultMessage: 'Collapse filter pills',
    }),
  getExpandLabel: () =>
    i18n.translate('unifiedSearch.filter.filterCountButton.expand', {
      defaultMessage: 'Expand filter pills',
    }),
  getAddFilterLabel: () =>
    i18n.translate('unifiedSearch.filter.filterCountButton.addFilter', {
      defaultMessage: 'Add a filter',
    }),
};

enum FilterCountMenuPanel {
  main = 'main',
  applyToAll = 'applyToAll',
}

export const FilterCountButton: React.FC<FilterCountButtonProps> = ({
  filters,
  onFiltersUpdated,
  onToggleFilterBarCollapsed,
  onAddFilter,
  isFilterBarCollapsed,
  isDisabled,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'filterCountPopover' });

  const filterCount = filters.length;

  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((prev) => !prev), []);

  const onEnableAll = useCallback(() => {
    const enabledFilters = filters.map(enableFilter);
    onFiltersUpdated?.(enabledFilters);
    closePopover();
  }, [filters, onFiltersUpdated, closePopover]);

  const onDisableAll = useCallback(() => {
    const disabledFilters = filters.map(disableFilter);
    onFiltersUpdated?.(disabledFilters);
    closePopover();
  }, [filters, onFiltersUpdated, closePopover]);

  const onToggleAllNegated = useCallback(() => {
    const negatedFilters = filters.map(toggleFilterNegated);
    onFiltersUpdated?.(negatedFilters);
    closePopover();
  }, [filters, onFiltersUpdated, closePopover]);

  const onPinAll = useCallback(() => {
    const pinnedFilters = filters.map(pinFilter);
    onFiltersUpdated?.(pinnedFilters);
    closePopover();
  }, [filters, onFiltersUpdated, closePopover]);

  const onUnpinAll = useCallback(() => {
    const unpinnedFilters = filters.map(unpinFilter);
    onFiltersUpdated?.(unpinnedFilters);
    closePopover();
  }, [filters, onFiltersUpdated, closePopover]);

  const onClearAll = useCallback(() => {
    onFiltersUpdated?.([]);
    closePopover();
  }, [onFiltersUpdated, closePopover]);

  const onAddFilterClick = useCallback(() => {
    onAddFilter?.();
    closePopover();
  }, [onAddFilter, closePopover]);

  const onToggleCollapse = useCallback(() => {
    onToggleFilterBarCollapsed?.();
    closePopover();
  }, [onToggleFilterBarCollapsed, closePopover]);

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: FilterCountMenuPanel.main,
      items: [
        {
          name: isFilterBarCollapsed
            ? strings.getExpandLabel()
            : strings.getCollapseLabel(),
          icon: isFilterBarCollapsed ? 'unfold' : 'fold',
          disabled: filterCount === 0 && !isFilterBarCollapsed,
          'data-test-subj': 'filterCountButton-collapseToggle',
          onClick: onToggleCollapse,
        },
        {
          name: strings.getApplyToAllLabel(),
          icon: 'filter',
          panel: FilterCountMenuPanel.applyToAll,
          disabled: filterCount === 0,
          'data-test-subj': 'filterCountButton-applyToAll',
        },
        {
          name: strings.getClearAllLabel(),
          icon: 'cross',
          disabled: filterCount === 0,
          'data-test-subj': 'filterCountButton-clearAll',
          onClick: onClearAll,
        },
        {
          isSeparator: true,
        },
        {
          name: strings.getAddFilterLabel(),
          icon: 'plus',
          'data-test-subj': 'filterCountButton-addFilter',
          onClick: onAddFilterClick,
        },
      ],
    },
    {
      id: FilterCountMenuPanel.applyToAll,
      title: strings.getApplyToAllLabel(),
      items: [
        {
          name: strings.getEnableAllLabel(),
          icon: 'eye',
          'data-test-subj': 'filterCountButton-enableAll',
          onClick: onEnableAll,
        },
        {
          name: strings.getDisableAllLabel(),
          icon: 'eyeClosed',
          'data-test-subj': 'filterCountButton-disableAll',
          onClick: onDisableAll,
        },
        {
          name: strings.getInvertInclusionLabel(),
          icon: 'invert',
          'data-test-subj': 'filterCountButton-invertAll',
          onClick: onToggleAllNegated,
        },
        {
          name: strings.getPinAllLabel(),
          icon: 'pin',
          'data-test-subj': 'filterCountButton-pinAll',
          onClick: onPinAll,
        },
        {
          name: strings.getUnpinAllLabel(),
          icon: 'pin',
          'data-test-subj': 'filterCountButton-unpinAll',
          onClick: onUnpinAll,
        },
      ],
    },
  ];

  const button = (
    <EuiToolTip
      delay="long"
      content={strings.getButtonLabel(filterCount)}
      disableScreenReaderOutput
    >
      <button
        type="button"
        onClick={togglePopover}
        disabled={isDisabled}
        aria-label={strings.getButtonLabel(filterCount)}
        data-test-subj="filterCountButton"
        css={css`
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: ${euiTheme.size.xs};
          height: ${euiTheme.size.xl};
          padding-inline: ${euiTheme.size.s};
          border: ${euiTheme.border.width.thin} solid ${euiTheme.colors.borderBaseSubdued};
          border-radius: ${euiTheme.border.radius.small};
          background: none;
          cursor: pointer;

          &:disabled {
            cursor: not-allowed;
            opacity: 0.5;
          }
        `}
      >
        <EuiIcon type="filter" size="s" />
        <EuiNotificationBadge color="subdued">{filterCount}</EuiNotificationBadge>
      </button>
    </EuiToolTip>
  );

  return (
    <EuiPopover
      id={popoverId}
      button={button}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      repositionOnScroll
      data-test-subj="filterCountButtonPopover"
    >
      <EuiContextMenu
        initialPanelId={FilterCountMenuPanel.main}
        panels={panels}
        data-test-subj="filterCountButtonMenu"
      />
    </EuiPopover>
  );
};

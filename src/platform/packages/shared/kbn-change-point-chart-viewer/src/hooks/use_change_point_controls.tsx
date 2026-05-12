/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  type EuiSwitchEvent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ToolbarSelector, type SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { ChangePointCardModel } from '../utils/derive_change_point_cards';

// (string & {}) preserves literal intellisense for 'default'/'pvalue' while
// still accepting any column name at runtime.
export type SortField = 'default' | 'pvalue' | (string & {});
export type SortDirection = 'asc' | 'desc';

// Static labels defined at module level so they are not recreated on every render.
const SORT_BY_LABEL = i18n.translate('changePointChartViewer.controls.sort.buttonLabel', {
  defaultMessage: 'Sort by',
});
const TOP_TEN_LABEL = i18n.translate('changePointChartViewer.controls.topTen.label', {
  defaultMessage: 'Top 10 most significant',
});

// Known display labels for change point types. getTypeLabel falls back to
// replacing underscores with spaces for any type not in this map.
const TYPE_LABELS: Record<string, string> = {
  spike: i18n.translate('changePointChartViewer.controls.typeFilter.spike', {
    defaultMessage: 'Spike',
  }),
  dip: i18n.translate('changePointChartViewer.controls.typeFilter.dip', {
    defaultMessage: 'Dip',
  }),
  step_change: i18n.translate('changePointChartViewer.controls.typeFilter.stepChange', {
    defaultMessage: 'Step change',
  }),
  trend_change: i18n.translate('changePointChartViewer.controls.typeFilter.trendChange', {
    defaultMessage: 'Trend change',
  }),
  distribution_change: i18n.translate(
    'changePointChartViewer.controls.typeFilter.distributionChange',
    { defaultMessage: 'Distribution change' }
  ),
};

const getTypeLabel = (t: string): string => TYPE_LABELS[t] ?? t.replace(/_/g, ' ');

interface ChangePointControlsResult {
  displayedCards: ChangePointCardModel[];
  currentPage: number;
  setCurrentPage: (page: number) => void;
  controlsNode: React.ReactNode;
}

export const useChangePointControls = (
  cards: ChangePointCardModel[] | undefined
): ChangePointControlsResult => {
  const [sortField, setSortField] = useState<SortField>('default');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedTypes, setSelectedTypes] = useState<ReadonlySet<string>>(new Set());
  const [showTopTen, setShowTopTen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  // Derive sortable columns from the first card's entityValues keys — works for both
  // explicit BY columns and heuristic entity columns.
  const sortableColumns = useMemo(() => Object.keys(cards?.[0]?.entityValues ?? {}), [cards]);

  const availableTypes = useMemo(() => {
    const seen = new Set<string>();
    for (const card of cards ?? []) {
      for (const t of card.changePointTypes) seen.add(t);
    }
    return [...seen].sort();
  }, [cards]);

  const hasPvalueData = useMemo(
    () => Boolean(cards?.some((c) => c.minPvalue !== undefined)),
    [cards]
  );

  // Options: Default always present; pvalue when data exists; one entry per sortable column.
  const sortOptions = useMemo(() => {
    const opts: Array<{ value: string; text: string }> = [
      {
        value: 'default',
        text: i18n.translate('changePointChartViewer.controls.sort.default', {
          defaultMessage: 'Default order',
        }),
      },
    ];
    if (hasPvalueData) {
      opts.push({
        value: 'pvalue',
        text: i18n.translate('changePointChartViewer.controls.sort.pvalue', {
          defaultMessage: 'pvalue',
        }),
      });
    }
    for (const col of sortableColumns) {
      opts.push({ value: col, text: col });
    }
    return opts;
  }, [hasPvalueData, sortableColumns]);

  // filter → sort → top-10
  const displayedCards = useMemo(() => {
    if (!cards?.length) return [];
    let result: ChangePointCardModel[] = cards;

    // 1. Filter by selected types (only cards that have at least one matching type)
    if (selectedTypes.size > 0) {
      result = result.filter((c) => c.changePointTypes.some((t) => selectedTypes.has(t)));
    }

    // 2. Sort (creates a new array only when sorting is active, avoiding an unnecessary copy)
    if (sortField !== 'default') {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortField === 'pvalue') {
          if (a.minPvalue === undefined && b.minPvalue === undefined) cmp = 0;
          else if (a.minPvalue === undefined) cmp = 1;
          else if (b.minPvalue === undefined) cmp = -1;
          else cmp = a.minPvalue - b.minPvalue;
        } else {
          // sortField is a column name — sort by that column's serialized entity value
          cmp = (a.entityValues[sortField] ?? '').localeCompare(b.entityValues[sortField] ?? '');
        }
        return sortDirection === 'asc' ? cmp : -cmp;
      });
    }

    // 3. Top-10 slice (respects current sort order)
    if (showTopTen) result = result.slice(0, 10);

    return result;
  }, [cards, sortField, sortDirection, selectedTypes, showTopTen]);

  // Reset pagination whenever the displayed set changes so the user doesn't land on an empty page.
  // Using a ref comparison avoids an extra render cycle — the state update is batched with the
  // render that produced the new displayedCards reference.
  const prevDisplayedRef = useRef(displayedCards);
  if (prevDisplayedRef.current !== displayedCards) {
    prevDisplayedRef.current = displayedCards;
    setCurrentPage(0);
  }

  const handleSortFieldChange = useCallback((option?: SelectableEntry) => {
    setSortField((option?.value ?? 'default') as SortField);
  }, []);

  const handleDirectionToggle = useCallback(() => {
    setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
  }, []);

  const handleTypeFilterChange = useCallback((options?: SelectableEntry[]) => {
    setSelectedTypes(new Set(options?.map((o) => o.value) ?? []));
  }, []);

  const handleTopTenToggle = useCallback((e: EuiSwitchEvent) => {
    setShowTopTen(e.target.checked);
  }, []);

  // Rebuilt only when sort field, direction, or available options change.
  // The active non-default option gets an inline direction-toggle button as its append.
  const sortSelectableOptions = useMemo<SelectableEntry[]>(
    () =>
      sortOptions.map((opt) => {
        const isActive = sortField === opt.value && opt.value !== 'default';
        return {
          key: opt.value,
          value: opt.value,
          label: opt.text,
          checked: sortField === opt.value ? ('on' as const) : undefined,
          append: isActive ? (
            <EuiButtonIcon
              iconType={sortDirection === 'asc' ? 'arrowUp' : 'arrowDown'}
              aria-label={
                sortDirection === 'asc'
                  ? i18n.translate('changePointChartViewer.controls.sort.direction.ascending', {
                      defaultMessage: 'Ascending',
                    })
                  : i18n.translate('changePointChartViewer.controls.sort.direction.descending', {
                      defaultMessage: 'Descending',
                    })
              }
              size="xs"
              onClick={(e: React.MouseEvent) => {
                // Prevent the click from re-selecting the option or closing the popover.
                e.stopPropagation();
                handleDirectionToggle();
              }}
              data-test-subj="changePointSortDirectionButton"
            />
          ) : undefined,
        };
      }),
    [sortOptions, sortField, sortDirection, handleDirectionToggle]
  );

  // Rebuilt only when available types or the active selection changes.
  const filterSelectableOptions = useMemo<SelectableEntry[]>(
    () =>
      availableTypes.map((t) => ({
        key: t,
        value: t,
        label: getTypeLabel(t),
        checked: selectedTypes.has(t) ? ('on' as const) : undefined,
      })),
    [availableTypes, selectedTypes]
  );

  // Label reflects active filter count; rebuilt only when the count changes.
  const filterButtonLabel = useMemo(
    () =>
      selectedTypes.size > 0
        ? i18n.translate('changePointChartViewer.controls.filter.buttonLabelActive', {
            defaultMessage: 'Filter by ({count})',
            values: { count: selectedTypes.size },
          })
        : i18n.translate('changePointChartViewer.controls.filter.buttonLabel', {
            defaultMessage: 'Filter by',
          }),
    [selectedTypes]
  );

  const cardCount = cards?.length ?? 0;

  // Hide all controls when there is only one chart — nothing to sort or filter.
  const showSortControls = cardCount > 1 && sortOptions.length > 1;
  const showTypeFilter = cardCount > 1 && filterSelectableOptions.length > 0;
  // Top-10 filter is only meaningful when there are more than 10 charts.
  const showTopTenSwitch = cardCount > 1 && cardCount > 10 && hasPvalueData;

  // Thin composition layer — each piece is pre-computed above with its own dep list.
  const controlsNode = useMemo(() => {
    if (!showSortControls && !showTypeFilter && !showTopTenSwitch) return null;
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        {showSortControls && (
          <EuiFlexItem grow={false}>
            <ToolbarSelector
              data-test-subj="changePointSortSelector"
              buttonLabel={SORT_BY_LABEL}
              options={sortSelectableOptions}
              searchable={false}
              singleSelection
              onChange={handleSortFieldChange}
            />
          </EuiFlexItem>
        )}
        {showTypeFilter && (
          <EuiFlexItem grow={false}>
            <ToolbarSelector
              data-test-subj="changePointTypeFilterSelector"
              buttonLabel={filterButtonLabel}
              options={filterSelectableOptions}
              searchable={false}
              singleSelection={false}
              onChange={handleTypeFilterChange}
            />
          </EuiFlexItem>
        )}
        {showTopTenSwitch && (
          <EuiFlexItem grow={false}>
            <EuiSwitch
              compressed
              checked={showTopTen}
              label={TOP_TEN_LABEL}
              onChange={handleTopTenToggle}
              data-test-subj="changePointTopTenSwitch"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }, [
    showSortControls,
    showTypeFilter,
    showTopTenSwitch,
    sortSelectableOptions,
    filterSelectableOptions,
    filterButtonLabel,
    showTopTen,
    handleSortFieldChange,
    handleTypeFilterChange,
    handleTopTenToggle,
  ]);

  return { displayedCards, currentPage, setCurrentPage, controlsNode };
};

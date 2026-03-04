/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiEmptyPrompt,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiText,
  EuiToolTip,
  EuiWrappingPopover,
  copyToClipboard,
  useEuiTheme,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils';
import {
  DataLoadingState,
  UnifiedDataTable,
  DataGridDensity,
  getRenderCustomToolbarWithElements,
  type UnifiedDataTableProps,
  type SortOrder,
} from '@kbn/unified-data-table';
import type { AggregateQuery } from '@kbn/es-query';
import { getCascadeGridStyles } from './tanstack_cascade_grid.styles';
import { useDiscoverServices } from '../../../hooks/use_discover_services';

const GROUP_ROW_HEIGHT = 32;
const EXPANDED_PANEL_HEIGHT = 400;
const MAX_DOCS_PER_GROUP = 100;
const OVERSCAN = 25;

// ── SI prefix number formatting (matching NumberBadge) ──

const SI_PREFIXES_CENTER = 8;
const siPrefixes = ['y', 'z', 'a', 'f', 'p', 'n', 'μ', 'm', '', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];

const getSiPrefixedNumber = (n: number): string => {
  if (n === 0) return '0';
  const base = Math.floor(Math.log10(Math.abs(n)));
  const siBase = (base < 0 ? Math.ceil : Math.floor)(base / 3);
  const prefix = siPrefixes[siBase + SI_PREFIXES_CENTER];
  if (siBase === 0) return n.toString();
  const baseNumber = parseFloat((n / Math.pow(10, siBase * 3)).toFixed(2));
  return `${baseNumber}${prefix}`;
};

const formatNumberBadge = (value: number): string => {
  if (Math.floor(value / 1000) >= 1) return getSiPrefixedNumber(value);
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const isBlankValue = (v: unknown): boolean => v === null || v === undefined || v === '';

interface StatsByInfo {
  byFields: string[];
  aggregateColumns: string[];
}

const parseStatsByColumns = (query: AggregateQuery | undefined, columns: string[]): StatsByInfo | undefined => {
  if (!query || !('esql' in query)) return undefined;
  // Use [\s\S]+? to span newlines between STATS and BY, and (.+) greedy to capture the rest
  const byMatch = query.esql.match(/\bSTATS\b[\s\S]+?\bBY\b\s+(.+)/i);
  if (!byMatch) return undefined;
  // Strip everything after a pipe or end-of-line comment
  let byClause = byMatch[1];
  const pipeIdx = byClause.indexOf('|');
  if (pipeIdx >= 0) byClause = byClause.slice(0, pipeIdx);
  byClause = byClause.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const byFields = byClause.split(',').map((f) => f.trim()).filter(Boolean);
  if (byFields.length === 0) return undefined;
  return { byFields, aggregateColumns: columns.filter((c) => !byFields.includes(c)) };
};

const buildWhereClause = (byFields: string[], record: DataTableRecord): string => {
  return byFields.map((field) => {
    const val = record.flattened[field];
    if (val === null || val === undefined) return `\`${field}\` IS NULL`;
    if (typeof val === 'number') return `\`${field}\` == ${val}`;
    if (typeof val === 'boolean') return `\`${field}\` == ${val}`;
    const escaped = String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `\`${field}\` == "${escaped}"`;
  }).join(' AND ');
};

const buildSubQuery = (originalQuery: string, byFields: string[], record: DataTableRecord): string => {
  const parts = originalQuery.split('|').map((s) => s.trim());
  const statsIdx = parts.findIndex((p) => /^\s*STATS\b/i.test(p));
  const base = statsIdx > 0 ? parts.slice(0, statsIdx) : [parts[0]];
  return `${base.join(' | ')} | WHERE ${buildWhereClause(byFields, record)} | LIMIT ${MAX_DOCS_PER_GROUP}`;
};

// ── Types ──

export interface FetchGroupDocsParams {
  subQuery: AggregateQuery;
  dataView: DataView;
  signal: AbortSignal;
}

export type FetchGroupDocsFn = (params: FetchGroupDocsParams) => Promise<DataTableRecord[]>;

export type OpenInNewTabFn = (params: { appState?: { query?: AggregateQuery } }) => void;

export interface TanStackCascadeGridProps {
  rows: DataTableRecord[];
  columns: string[];
  columnsMeta?: DataTableColumnsMeta;
  dataView: DataView;
  query: AggregateQuery;
  showTimeCol: boolean;
  sort?: SortOrder[];
  onSort?: (sort: SortOrder[]) => void;
  onFilter?: UnifiedDataTableProps['onFilter'];
  expandedDoc?: DataTableRecord;
  setExpandedDoc?: UnifiedDataTableProps['setExpandedDoc'];
  renderDocumentView?: UnifiedDataTableProps['renderDocumentView'];
  loadingState?: DataLoadingState;
  settings?: UnifiedDataTableProps['settings'];
  fetchGroupDocuments: FetchGroupDocsFn;
  onOpenInNewTab?: OpenInNewTabFn;
  availableCascadeGroups?: string[];
  selectedCascadeGroups?: string[];
  onCascadeGroupingChange?: (groups: string[]) => void;
  externalCustomRenderers?: UnifiedDataTableProps['externalCustomRenderers'];
}

interface GroupDocsState {
  docs: DataTableRecord[] | null;
  loading: boolean;
  error: string | null;
}

// Module-level caches that survive tab switches (component unmount/remount)
const scrollPositionCache = new Map<string, number>();
const expandedGroupsCache = new Map<string, Set<string>>();
const groupDocsCacheMap = new Map<string, Map<string, GroupDocsState>>();

// ── Expanded group grid (UnifiedDataTable) ──

const EMPTY_SORT: SortOrder[] = [];

const ExpandedGroupGrid = React.memo(({
  state, dataView, showTimeCol, renderDocumentView, externalCustomRenderers, onRetry, styles, rowId,
}: {
  state: GroupDocsState; dataView: DataView; showTimeCol: boolean;
  renderDocumentView?: UnifiedDataTableProps['renderDocumentView'];
  externalCustomRenderers?: UnifiedDataTableProps['externalCustomRenderers'];
  onRetry: () => void; styles: ReturnType<typeof getCascadeGridStyles>; rowId: string;
}) => {
  const services = useDiscoverServices();
  const [expandedDoc, setExpandedDoc] = useState<DataTableRecord | undefined>();
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [density, setDensity] = useState<DataGridDensity>(DataGridDensity.COMPACT);

  const setExpandedDocFn = useCallback(
    (...args: Parameters<NonNullable<UnifiedDataTableProps['setExpandedDoc']>>) => setExpandedDoc(args[0]),
    []
  );

  if (state.loading && !state.docs) {
    return <div css={styles.docsPanelLoading}><EuiLoadingSpinner size="m" /><EuiText size="xs" color="subdued">Loading documents…</EuiText></div>;
  }
  if (state.error) {
    return (
      <div css={styles.docsPanelError}>
        <EuiIcon type="warning" color="danger" /><EuiText size="xs" color="danger">{state.error}</EuiText>
        <EuiButtonEmpty size="xs" onClick={onRetry}>Retry</EuiButtonEmpty>
      </div>
    );
  }
  const docs = state.docs ?? [];
  if (docs.length === 0) {
    return <div css={styles.docsPanelLoading}><EuiText size="xs" color="subdued">No documents found for this group.</EuiText></div>;
  }

  const renderCustomToolbar = getRenderCustomToolbarWithElements({
    leftSide: (
      <EuiText size="s">
        <strong>{docs.length} {docs.length === 1 ? 'result' : 'results'}</strong>
      </EuiText>
    ),
  });

  return (
    <div css={styles.docsPanel} data-test-subj="cascadeDocsPanel" style={{ height: EXPANDED_PANEL_HEIGHT }}>
      <EuiPanel paddingSize="none" css={styles.docsPanelInner}>
        <UnifiedDataTable
          isPlainRecord
          dataView={dataView}
          showTimeCol={showTimeCol}
          services={services}
          sort={EMPTY_SORT}
          isSortEnabled={false}
          ariaLabelledBy={`cascade-leaf-${rowId}`}
          consumer={`discover_cascade_leaf_${rowId}`}
          rows={docs}
          loadingState={state.loading ? DataLoadingState.loading : DataLoadingState.loaded}
          columns={selectedColumns}
          onSetColumns={setSelectedColumns}
          renderCustomToolbar={renderCustomToolbar}
          expandedDoc={expandedDoc}
          setExpandedDoc={setExpandedDocFn}
          dataGridDensityState={density}
          onUpdateDataGridDensity={setDensity}
          renderDocumentView={renderDocumentView}
          externalCustomRenderers={externalCustomRenderers}
          paginationMode="infinite"
          sampleSizeState={docs.length}
        />
      </EuiPanel>
    </div>
  );
});

// ── Group row (matching old cascade layout: expand btn | title 4/10 | meta 6/10 | actions btn) ──

const CascadeGroupRow = React.memo(({
  record, isExpanded, onToggle, onActionsClick, byFields, aggregateColumns, styles, ariaProps,
}: {
  record: DataTableRecord; isExpanded: boolean; onToggle: () => void;
  onActionsClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  byFields: string[]; aggregateColumns: string[];
  styles: ReturnType<typeof getCascadeGridStyles>;
  ariaProps: Record<string, string | number | boolean>;
}) => {
  const groupValue = byFields.map((f) => record.flattened[f]).map(formatCellValue).join(', ');
  const blank = byFields.every((f) => isBlankValue(record.flattened[f]));

  return (
    <div
      css={[styles.groupRow, isExpanded && styles.groupRowExpanded]}
      role="row"
      tabIndex={-1}
      data-test-subj="cascadeGroupRow"
      data-row-id={record.id}
      {...ariaProps}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
    >
      {/* Expand/collapse button */}
      <EuiIcon type={isExpanded ? 'arrowDown' : 'arrowRight'} size="s" />

      {/* Title slot (4/10 flex growth) */}
      <div css={[styles.groupTitle, blank && styles.groupTitleBlank]}>
        <h4>{blank ? '(blank)' : groupValue}</h4>
      </div>

      {/* Meta slots (6/10 flex growth) — aggregates */}
      <div css={styles.groupMeta}>
        {aggregateColumns.map((col) => {
          const val = record.flattened[col];
          return (
            <div key={col} css={styles.metaSlot}>
              <span css={styles.metaLabel}>{col}:</span>
              {typeof val === 'number' ? (
                <span css={styles.numberBadge} title={String(val)}>
                  {formatNumberBadge(val)}
                </span>
              ) : (
                <EuiBadge color="hollow" css={styles.textBadge}>
                  {isBlankValue(val) ? '(blank)' : formatCellValue(val)}
                </EuiBadge>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions button (3-dot menu) */}
      <EuiButtonIcon
        css={styles.actionsBtn}
        iconType="boxesVertical"
        aria-label="Row actions"
        size="xs"
        color="text"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onActionsClick(e); }}
        data-test-subj="cascadeRowActionsBtn"
      />
    </div>
  );
});

// ── Group By selector (matching old cascade header) ──

const NONE_GROUP_OPTION = 'none';

const GroupBySelector = React.memo(({
  availableColumns, currentSelectedColumns, onChange,
}: {
  availableColumns: string[]; currentSelectedColumns: string[];
  onChange: (groups: string[]) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const options = useMemo(
    () => [NONE_GROUP_OPTION, ...availableColumns].map((field) => ({
      label: field,
      'data-test-subj': field === NONE_GROUP_OPTION ? 'cascadeGroupByNone' : `cascadeGroupBy-${field}`,
      checked: (field === NONE_GROUP_OPTION && !currentSelectedColumns.length) || currentSelectedColumns.includes(field) ? ('on' as const) : undefined,
    })),
    [availableColumns, currentSelectedColumns]
  );

  const handleChange = useCallback<NonNullable<React.ComponentProps<typeof EuiSelectable>['onActiveOptionChange']>>(
    (option) => {
      if (option) {
        onChange([option.label].filter((o) => o !== NONE_GROUP_OPTION));
      }
      setIsOpen(false);
    },
    [onChange]
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiFilterGroup>
          <EuiButtonEmpty
            size="xs"
            iconType="inspect"
            onClick={() => setIsOpen((p) => !p)}
            data-test-subj="cascadeGroupBySelector"
          >
            Group by{currentSelectedColumns.length > 0 && ` (${currentSelectedColumns.join(', ')})`}
          </EuiButtonEmpty>
        </EuiFilterGroup>
      }
    >
      <EuiSelectable
        searchable={false}
        listProps={{ isVirtualized: false }}
        options={options}
        singleSelection="always"
        onActiveOptionChange={handleChange}
        data-test-subj="cascadeGroupBySelectionList"
      >
        {(list) => <div style={{ width: 300 }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
});

// ── Main component ──

export const TanStackCascadeGrid: React.FC<TanStackCascadeGridProps> = React.memo(({
  rows, columns, columnsMeta, dataView, query, showTimeCol,
  sort, onSort, onFilter,
  expandedDoc, setExpandedDoc, renderDocumentView,
  loadingState, settings, fetchGroupDocuments, onOpenInNewTab,
  availableCascadeGroups, selectedCascadeGroups, onCascadeGroupingChange,
  externalCustomRenderers,
}) => {
  const { euiTheme } = useEuiTheme();
  const parentRef = useRef<HTMLDivElement | null>(null);
  const styles = useMemo(() => getCascadeGridStyles(euiTheme), [euiTheme]);
  const esqlQuery = 'esql' in query ? query.esql : '';

  // Stable cache key: dataView id + query hash (survives tab switches)
  const cacheKey = `${dataView.id ?? dataView.title}::${esqlQuery}`;

  // ── Parse STATS...BY ──
  const statsByInfo = useMemo(() => parseStatsByColumns(query, columns), [query, columns]);
  const byFields = statsByInfo?.byFields ?? [];
  const aggregateColumns = statsByInfo?.aggregateColumns ?? [];

  // ── Expansion state (restore from cache on mount) ──
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => expandedGroupsCache.get(cacheKey) ?? new Set()
  );
  const toggleGroup = useCallback((rowId: string) => {
    setExpandedGroups((prev) => { const next = new Set(prev); if (next.has(rowId)) next.delete(rowId); else next.add(rowId); return next; });
  }, []);

  const expandAll = useCallback(() => {
    const all = new Set(rows.map((r) => r.id));
    setExpandedGroups(all);
    rows.forEach((r) => fetchDocsForRow(r.id, r));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const collapseAll = useCallback(() => {
    abortControllersRef.current.forEach((c) => c.abort());
    abortControllersRef.current.clear();
    setExpandedGroups(new Set());
  }, []);

  // ── Fetched documents cache (restore from module cache on mount) ──
  const [groupDocsMap, setGroupDocsMap] = useState<Map<string, GroupDocsState>>(
    () => groupDocsCacheMap.get(cacheKey) ?? new Map()
  );
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const groupDocsMapRef = useRef(groupDocsMap);
  groupDocsMapRef.current = groupDocsMap;

  const fetchDocsForRow = useCallback(async (rowId: string, record: DataTableRecord) => {
    const existing = groupDocsMapRef.current.get(rowId);
    if (existing?.docs) return;
    abortControllersRef.current.get(rowId)?.abort();
    const controller = new AbortController();
    abortControllersRef.current.set(rowId, controller);
    setGroupDocsMap((prev) => { const next = new Map(prev); next.set(rowId, { docs: null, loading: true, error: null }); return next; });
    try {
      const docs = await fetchGroupDocuments({ subQuery: { esql: buildSubQuery(esqlQuery, byFields, record) }, dataView, signal: controller.signal });
      setGroupDocsMap((prev) => { const next = new Map(prev); next.set(rowId, { docs, loading: false, error: null }); return next; });
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setGroupDocsMap((prev) => { const next = new Map(prev); next.set(rowId, { docs: null, loading: false, error: err?.message ?? 'Fetch failed' }); return next; });
    } finally {
      abortControllersRef.current.delete(rowId);
    }
  }, [esqlQuery, byFields, dataView, fetchGroupDocuments]);

  const cancelFetch = useCallback((rowId: string) => { abortControllersRef.current.get(rowId)?.abort(); abortControllersRef.current.delete(rowId); }, []);

  useEffect(() => { return () => { abortControllersRef.current.forEach((c) => c.abort()); abortControllersRef.current.clear(); }; }, []);

  // Persist expansion + docs state to module cache on every change
  useEffect(() => { expandedGroupsCache.set(cacheKey, expandedGroups); }, [cacheKey, expandedGroups]);
  useEffect(() => { groupDocsCacheMap.set(cacheKey, groupDocsMap); }, [cacheKey, groupDocsMap]);

  // Reset on query change (not just row count — row count can fluctuate)
  const prevCacheKeyRef = useRef(cacheKey);
  useEffect(() => {
    if (prevCacheKeyRef.current !== cacheKey) {
      prevCacheKeyRef.current = cacheKey;
      setExpandedGroups(expandedGroupsCache.get(cacheKey) ?? new Set());
      setGroupDocsMap(groupDocsCacheMap.get(cacheKey) ?? new Map());
      abortControllersRef.current.forEach((c) => c.abort());
      abortControllersRef.current.clear();
    }
  }, [cacheKey]);

  const handleToggle = useCallback((rowId: string, record: DataTableRecord) => {
    const willExpand = !expandedGroups.has(rowId);
    toggleGroup(rowId);
    if (willExpand) fetchDocsForRow(rowId, record); else cancelFetch(rowId);
  }, [expandedGroups, toggleGroup, fetchDocsForRow, cancelFetch]);

  const handleRetry = useCallback((rowId: string, record: DataTableRecord) => {
    setGroupDocsMap((prev) => { const next = new Map(prev); next.delete(rowId); return next; });
    fetchDocsForRow(rowId, record);
  }, [fetchDocsForRow]);

  // ── Context menu (3-dot popover matching old tab) ──
  const popoverBtnRef = useRef<HTMLButtonElement | null>(null);
  const [popoverRow, setPopoverRow] = useState<{ id: string; record: DataTableRecord } | null>(null);
  const closePopover = useCallback(() => setPopoverRow(null), []);

  const handleActionsClick = useCallback((e: React.MouseEvent<HTMLButtonElement>, record: DataTableRecord) => {
    popoverBtnRef.current = e.currentTarget;
    setPopoverRow((prev) => prev?.id === record.id ? null : { id: record.id, record });
  }, []);

  const contextMenuPanels = useMemo(() => {
    if (!popoverRow) return [];
    const groupValue = byFields.map((f) => formatCellValue(popoverRow.record.flattened[f])).join(', ');
    return [{
      id: 'cascade-actions',
      items: [
        {
          name: 'Copy to clipboard',
          icon: 'copy',
          'data-test-subj': 'cascadeActionCopy',
          onClick: () => { copyToClipboard(groupValue); closePopover(); },
        },
        ...(onFilter ? [
          {
            name: 'Filter in',
            icon: 'plusInCircle',
            'data-test-subj': 'cascadeActionFilterIn',
            disabled: byFields.every((f) => isBlankValue(popoverRow.record.flattened[f])),
            onClick: () => { byFields.forEach((f) => onFilter!(f, popoverRow.record.flattened[f], '+')); closePopover(); },
          },
          {
            name: 'Filter out',
            icon: 'minusInCircle',
            'data-test-subj': 'cascadeActionFilterOut',
            disabled: byFields.every((f) => isBlankValue(popoverRow.record.flattened[f])),
            onClick: () => { byFields.forEach((f) => onFilter!(f, popoverRow.record.flattened[f], '-')); closePopover(); },
          },
        ] : []),
        ...(onOpenInNewTab ? [
          {
            name: 'Open in new tab',
            icon: 'discoverApp',
            'data-test-subj': 'cascadeActionOpenInNewTab',
            onClick: () => {
              const subEsql = buildSubQuery(esqlQuery, byFields, popoverRow.record);
              onOpenInNewTab({ appState: { query: { esql: subEsql } } });
              closePopover();
            },
          },
        ] : []),
      ],
    }];
  }, [popoverRow, byFields, onFilter, onOpenInNewTab, esqlQuery, closePopover]);

  // ── Virtualizer ──
  const getRowHeight = useCallback((index: number): number => {
    const row = rows[index];
    if (!row) return GROUP_ROW_HEIGHT;
    if (!expandedGroups.has(row.id)) return GROUP_ROW_HEIGHT;
    const state = groupDocsMap.get(row.id);
    if (!state?.docs || state.docs.length === 0) return GROUP_ROW_HEIGHT + 56;
    return GROUP_ROW_HEIGHT + EXPANDED_PANEL_HEIGHT;
  }, [rows, expandedGroups, groupDocsMap]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getRowHeight,
    overscan: OVERSCAN,
    initialOffset: scrollPositionCache.get(cacheKey) ?? 0,
  });
  useEffect(() => { rowVirtualizer.measure(); }, [expandedGroups, groupDocsMap, rowVirtualizer]);

  // Persist scroll position to module cache
  useEffect(() => {
    const scrollEl = parentRef.current;
    if (!scrollEl) return;
    let rafId = 0;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        scrollPositionCache.set(cacheKey, scrollEl.scrollTop);
      });
    };
    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      scrollEl.removeEventListener('scroll', handleScroll);
    };
  }, [cacheKey]);

  // ── Keyboard navigation ──
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const total = rows.length;
    if (total === 0) return;
    let next = focusedIndex;
    const row = rows[focusedIndex];
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); next = Math.min(focusedIndex + 1, total - 1); break;
      case 'ArrowUp': e.preventDefault(); next = Math.max(focusedIndex - 1, 0); break;
      case 'Home': e.preventDefault(); next = 0; break;
      case 'End': e.preventDefault(); next = total - 1; break;
      case 'ArrowRight': e.preventDefault(); if (row && !expandedGroups.has(row.id)) handleToggle(row.id, row); return;
      case 'ArrowLeft': e.preventDefault(); if (row && expandedGroups.has(row.id)) handleToggle(row.id, row); return;
      default: return;
    }
    if (next !== focusedIndex) {
      setFocusedIndex(next);
      rowVirtualizer.scrollToIndex(next, { align: 'auto' });
      requestAnimationFrame(() => {
        (parentRef.current?.querySelector(`[data-row-id="${rows[next]?.id}"]`) as HTMLElement | null)?.focus();
      });
    }
  }, [focusedIndex, rows, expandedGroups, handleToggle, rowVirtualizer]);

  // ── Full screen ──
  const [isFullScreen, setIsFullScreen] = useState(false);
  const toggleFullScreen = useCallback(() => setIsFullScreen((p) => !p), []);

  const virtualItems = rowVirtualizer.getVirtualItems();
  const isLoading = loadingState === DataLoadingState.loading;
  const isEmpty = !isLoading && rows.length === 0;
  return (
    <div css={[styles.wrapper, isFullScreen && styles.fullScreen]} data-test-subj="tanstackCascadeWrapper">
      {/* Toolbar — matches old tab header: left = count, right = controls */}
      <div css={styles.toolbar}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{rows.length.toLocaleString()} {rows.length === 1 ? 'group' : 'groups'}</strong>
              {byFields.length > 0 && <span style={{ fontWeight: 'normal' }}>{' '}· by {byFields.join(', ')}</span>}
            </EuiText>
          </EuiFlexItem>
          {expandedGroups.size > 0 && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="accent">{expandedGroups.size} expanded</EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <div css={styles.toolbarRight}>
          {availableCascadeGroups && availableCascadeGroups.length > 0 && onCascadeGroupingChange && (
            <GroupBySelector
              availableColumns={availableCascadeGroups}
              currentSelectedColumns={selectedCascadeGroups ?? []}
              onChange={onCascadeGroupingChange}
            />
          )}
          <EuiToolTip content="Expand all groups">
            <EuiButtonIcon iconType="unfold" aria-label="Expand all groups" size="xs" onClick={expandAll} data-test-subj="cascadeExpandAll" />
          </EuiToolTip>
          <EuiToolTip content="Collapse all groups">
            <EuiButtonIcon iconType="fold" aria-label="Collapse all groups" size="xs" onClick={collapseAll} disabled={expandedGroups.size === 0} data-test-subj="cascadeCollapseAll" />
          </EuiToolTip>
          <EuiToolTip content={isFullScreen ? 'Exit full screen' : 'Full screen'}>
            <EuiButtonIcon iconType={isFullScreen ? 'fullScreenExit' : 'fullScreen'} aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'} size="xs" onClick={toggleFullScreen} data-test-subj="cascadeFullScreenButton" />
          </EuiToolTip>
        </div>
      </div>

      <div css={{ flex: 1, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {isEmpty ? (
          <EuiEmptyPrompt css={styles.emptyState} iconType="discoverApp" title={<h3>No groups found</h3>} body="The query returned no STATS...BY results." data-test-subj="cascadeNoResults" />
        ) : (
          <div ref={parentRef} css={styles.scrollContainer} role="treegrid" aria-label="Cascade document groups" aria-readonly="true" tabIndex={0} onKeyDown={handleKeyDown}>
            <div css={styles.virtualOuter} style={{ height: rowVirtualizer.getTotalSize() }}>
              <div css={styles.virtualInner} style={{ transform: `translateY(${virtualItems[0]?.start ?? 0}px)` }}>
                {virtualItems.map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  const rowId = row.id;
                  const isExpanded = expandedGroups.has(rowId);
                  const docsState = groupDocsMap.get(rowId);
                  return (
                    <div key={rowId} data-index={virtualRow.index} role="rowgroup">
                      <CascadeGroupRow
                        record={row}
                        isExpanded={isExpanded}
                        onToggle={() => handleToggle(rowId, row)}
                        onActionsClick={(e) => handleActionsClick(e, row)}
                        byFields={byFields}
                        aggregateColumns={aggregateColumns}
                        styles={styles}
                        ariaProps={{ 'aria-expanded': isExpanded, 'aria-level': 1, 'aria-posinset': virtualRow.index + 1, 'aria-setsize': rows.length }}
                      />
                      {isExpanded && docsState && (
                        <ExpandedGroupGrid
                          state={docsState}
                          dataView={dataView}
                          showTimeCol={showTimeCol}
                          renderDocumentView={renderDocumentView}
                          externalCustomRenderers={externalCustomRenderers}
                          styles={styles}
                          rowId={rowId}
                          onRetry={() => handleRetry(rowId, row)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {isLoading && <div css={styles.loadingOverlay}><EuiLoadingSpinner size="xl" /></div>}
          </div>
        )}

      </div>

      {/* Actions popover — matches old tab's EuiWrappingPopover + EuiContextMenu */}
      {popoverRow && popoverBtnRef.current && (
        <EuiWrappingPopover
          button={popoverBtnRef.current}
          isOpen
          closePopover={closePopover}
          panelPaddingSize="none"
          anchorPosition="downRight"
        >
          <EuiContextMenu
            initialPanelId="cascade-actions"
            panels={contextMenuPanels}
            data-test-subj="cascadeContextMenu"
          />
        </EuiWrappingPopover>
      )}
    </div>
  );
});

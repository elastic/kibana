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
  EuiDataGridToolbarControl,
  EuiEmptyPrompt,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiPopover,
  EuiProgress,
  EuiSelectable,
  EuiText,
  EuiToolTip,
  EuiWrappingPopover,
  copyToClipboard,
  useEuiTheme,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils';
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

// ── Constants ──

const GROUP_ROW_HEIGHT = 32;
const EXPANDED_PANEL_HEIGHT = 400;
const LOADING_ROW_HEIGHT = GROUP_ROW_HEIGHT + 56;
const EXPANDED_ROW_HEIGHT = GROUP_ROW_HEIGHT + EXPANDED_PANEL_HEIGHT;
const MAX_DOCS_PER_GROUP = 100;
const OVERSCAN = 15;

const EMPTY_STRINGS: string[] = [];
const EMPTY_SORT: SortOrder[] = [];

// ── Formatting helpers ──

const SI_PREFIXES = ['y', 'z', 'a', 'f', 'p', 'n', 'μ', 'm', '', 'k', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];

const formatNumberBadge = (value: number): string => {
  if (value === 0) return '0';
  if (Math.abs(value) < 1000) return Number.isInteger(value) ? String(value) : value.toFixed(2);
  const exp = Math.floor(Math.log10(Math.abs(value)));
  const si = Math.floor(exp / 3);
  return `${parseFloat((value / Math.pow(10, si * 3)).toFixed(2))}${SI_PREFIXES[si + 8]}`;
};

const formatCellValue = (value: unknown): string => {
  if (value == null) return '-';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const isBlank = (v: unknown): boolean => v == null || v === '';

// ── Query parsing ──

const parseStatsByColumns = (query: AggregateQuery | undefined, columns: string[]) => {
  if (!query || !('esql' in query)) return undefined;
  const m = query.esql.match(/\bSTATS\b[\s\S]+?\bBY\b\s+(.+)/i);
  if (!m) return undefined;
  let clause = m[1];
  const pipe = clause.indexOf('|');
  if (pipe >= 0) clause = clause.slice(0, pipe);
  clause = clause.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const byFields = clause.split(',').map((f) => f.trim()).filter(Boolean);
  if (!byFields.length) return undefined;
  return { byFields, aggregateColumns: columns.filter((c) => !byFields.includes(c)) };
};

const buildWhereClause = (byFields: string[], record: DataTableRecord): string =>
  byFields.map((field) => {
    const val = record.flattened[field];
    if (val == null) return `\`${field}\` IS NULL`;
    if (typeof val === 'number' || typeof val === 'boolean') return `\`${field}\` == ${val}`;
    return `\`${field}\` == "${String(val).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }).join(' AND ');

const splitOnPipe = (query: string): string[] => {
  const parts: string[] = [];
  let cur = '';
  for (let i = 0; i < query.length; i++) {
    const ch = query[i];
    if (ch === '"' || ch === "'") {
      const tri = query.slice(i, i + 3);
      if (tri === '"""' || tri === "'''") {
        const end = query.indexOf(tri, i + 3);
        const s = end === -1 ? query.slice(i) : query.slice(i, end + 3);
        cur += s; i += s.length - 1;
      } else {
        cur += ch; i++;
        while (i < query.length && query[i] !== ch) {
          if (query[i] === '\\' && i + 1 < query.length) { cur += query[i++]; }
          cur += query[i++];
        }
        if (i < query.length) cur += query[i];
      }
    } else if (ch === '|') { parts.push(cur); cur = ''; }
    else { cur += ch; }
  }
  parts.push(cur);
  return parts.map((s) => s.trim());
};

const buildSubQuery = (esql: string, byFields: string[], record: DataTableRecord): string => {
  const parts = splitOnPipe(esql);
  const si = parts.findIndex((p) => /^\s*STATS\b/i.test(p));
  const base = si > 0 ? parts.slice(0, si) : [parts[0]];
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
  columnsMeta?: UnifiedDataTableProps['columnsMeta'];
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

// ── Module-level caches (survive tab switches, bounded) ──

const MAX_CACHE = 20;
function evict<V>(cache: Map<string, V>) {
  if (cache.size > MAX_CACHE) cache.delete(cache.keys().next().value!);
}
const scrollCache = new Map<string, number>();
const expandCache = new Map<string, Set<string>>();
const docsCache = new Map<string, Map<string, GroupDocsState>>();

// ── ExpandedGroupGrid ──

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
  const setExpandedDocCb = useCallback((doc: DataTableRecord | undefined) => setExpandedDoc(doc), []);

  const docs = state.docs ?? [];
  const toolbar = useMemo(() => getRenderCustomToolbarWithElements({
    leftSide: <EuiText size="s"><strong>{docs.length} {docs.length === 1 ? 'result' : 'results'}</strong></EuiText>,
  }), [docs.length]);

  if (state.loading && !state.docs) {
    return <div css={styles.docsPanelLoading}><EuiLoadingSpinner size="m" /><EuiText size="xs" color="subdued">Loading documents…</EuiText></div>;
  }
  if (state.error) {
    return <div css={styles.docsPanelError}><EuiText size="xs" color="danger">{state.error}</EuiText><EuiButtonEmpty size="xs" onClick={onRetry}>Retry</EuiButtonEmpty></div>;
  }
  if (!docs.length) {
    return <div css={styles.docsPanelLoading}><EuiText size="xs" color="subdued">No documents found for this group.</EuiText></div>;
  }

  return (
    <div css={styles.docsPanel} data-test-subj="cascadeDocsPanel" style={{ height: EXPANDED_PANEL_HEIGHT }}>
      <EuiPanel paddingSize="none" css={styles.docsPanelInner}>
        <UnifiedDataTable
          isPlainRecord dataView={dataView} showTimeCol={showTimeCol} services={services}
          sort={EMPTY_SORT} isSortEnabled={false}
          ariaLabelledBy={`cascade-leaf-${rowId}`} consumer={`discover_cascade_leaf_${rowId}`}
          rows={docs} loadingState={state.loading ? DataLoadingState.loading : DataLoadingState.loaded}
          columns={selectedColumns} onSetColumns={setSelectedColumns}
          renderCustomToolbar={toolbar}
          expandedDoc={expandedDoc} setExpandedDoc={setExpandedDocCb}
          dataGridDensityState={density} onUpdateDataGridDensity={setDensity}
          renderDocumentView={renderDocumentView} externalCustomRenderers={externalCustomRenderers}
          paginationMode="infinite" sampleSizeState={docs.length}
        />
      </EuiPanel>
    </div>
  );
});

// ── CascadeGroupRow ──

const CascadeGroupRow = React.memo(({
  record, isExpanded, onToggle, onActionsClick, byFields, aggregateColumns, styles,
  index, totalRows,
}: {
  record: DataTableRecord; isExpanded: boolean;
  onToggle: (rowId: string, record: DataTableRecord) => void;
  onActionsClick: (e: React.MouseEvent<HTMLButtonElement>, record: DataTableRecord) => void;
  byFields: string[]; aggregateColumns: string[];
  styles: ReturnType<typeof getCascadeGridStyles>;
  index: number; totalRows: number;
}) => {
  const allBlank = byFields.every((f) => isBlank(record.flattened[f]));
  const title = allBlank ? '(blank)' : byFields.map((f) => formatCellValue(record.flattened[f])).join(', ');

  return (
    <div
      css={[styles.groupRow, isExpanded && styles.groupRowExpanded]}
      role="row" tabIndex={0} data-test-subj="cascadeGroupRow"
      data-row-id={record.id} data-row-type="root"
      aria-expanded={isExpanded} aria-level={1} aria-posinset={index + 1} aria-setsize={totalRows}
      onClick={() => onToggle(record.id, record)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(record.id, record); } }}
    >
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center" justifyContent="spaceBetween" responsive={false}
        data-test-subj={`${record.id}-row-header`} css={styles.rowHeader}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={isExpanded ? 'arrowDown' : 'arrowRight'} color="text" size="xs"
            aria-label={isExpanded ? 'collapse row' : 'expand row'}
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggle(record.id, record); }}
            data-test-subj={`toggle-row-${record.id}-button`}
          />
        </EuiFlexItem>

        <EuiFlexItem grow>
          <EuiFlexGroup gutterSize="m" justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem grow={4} css={styles.groupTitle}>
              <EuiText size="s">
                <h4 css={[styles.titleText, allBlank && styles.groupTitleBlank]}>{title}</h4>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={6}>
              <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" alignItems="center" responsive={false} wrap>
                {aggregateColumns.map((col) => {
                  const val = record.flattened[col];
                  return (
                    <EuiFlexItem key={col} grow={false}>
                      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiText size="s" css={styles.metaLabel}><strong>{col}:</strong></EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          {typeof val === 'number'
                            ? <EuiText size="s" css={styles.numberBadge} title={String(val)}><h5>{formatNumberBadge(val)}</h5></EuiText>
                            : <EuiBadge color="hollow" css={styles.textBadge}>{isBlank(val) ? '(blank)' : formatCellValue(val)}</EuiBadge>}
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  );
                })}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonIcon iconType="boxesVertical" size="xs" color="text"
            aria-label={`${record.id}-cascade-row-actions`}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); onActionsClick(e, record); }}
            data-test-subj={`${record.id}-dscCascadeRowContextActionButton`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
});

// ── GroupBySelector ──

const GroupBySelector = React.memo(({
  availableColumns, currentSelectedColumns, onChange,
}: {
  availableColumns: string[]; currentSelectedColumns: string[];
  onChange: (groups: string[]) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const options = useMemo(
    () => ['none', ...availableColumns].map((f) => ({
      label: f,
      'data-test-subj': f === 'none' ? 'discoverCascadeLayoutOptOutButton' : `${f}-cascadeLayoutOptionBtn`,
      checked: (f === 'none' && !currentSelectedColumns.length) || currentSelectedColumns.includes(f) ? ('on' as const) : undefined,
    })),
    [availableColumns, currentSelectedColumns]
  );

  return (
    <EuiPopover isOpen={isOpen} closePopover={() => setIsOpen(false)} panelPaddingSize="none"
      button={
        <EuiFilterGroup>
          <EuiDataGridToolbarControl iconType="inspect" color="text" onClick={() => setIsOpen((p) => !p)}
            badgeContent={currentSelectedColumns.length} data-test-subj="discoverEnableCascadeLayoutSwitch"
          >Group by</EuiDataGridToolbarControl>
        </EuiFilterGroup>
      }
    >
      <EuiSelectable searchable={false} listProps={{ isVirtualized: false }} options={options} singleSelection="always"
        onChange={(opts) => {
          const sel = opts.find((o) => o.checked === 'on');
          if (sel) onChange(sel.label === 'none' ? [] : [sel.label]);
          setIsOpen(false);
        }}
        data-test-subj="discoverGroupBySelectionList"
      >
        {(list) => <div style={{ width: 300 }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
});

// ── Main component ──

export const TanStackCascadeGrid: React.FC<TanStackCascadeGridProps> = React.memo(({
  rows, columns, dataView, query, showTimeCol, onFilter, renderDocumentView,
  loadingState, fetchGroupDocuments, onOpenInNewTab,
  availableCascadeGroups, selectedCascadeGroups, onCascadeGroupingChange,
  externalCustomRenderers,
}) => {
  const { euiTheme } = useEuiTheme();
  const parentRef = useRef<HTMLDivElement | null>(null);
  const styles = useMemo(() => getCascadeGridStyles(euiTheme), [euiTheme]);
  const esqlQuery = 'esql' in query ? query.esql : '';
  const cacheKey = `${dataView.id ?? dataView.title}::${esqlQuery}`;

  // Parse STATS...BY
  const parsed = useMemo(() => parseStatsByColumns(query, columns), [query, columns]);
  const byFields = parsed?.byFields ?? EMPTY_STRINGS;
  const aggCols = parsed?.aggregateColumns ?? EMPTY_STRINGS;

  // ── Expansion state ──
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => expandCache.get(cacheKey) ?? new Set());
  const expandedRef = useRef(expandedGroups);
  expandedRef.current = expandedGroups;

  const toggleGroup = useCallback((rowId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId); else next.add(rowId);
      return next;
    });
  }, []);

  // ── Group docs fetching ──
  const [groupDocs, setGroupDocs] = useState<Map<string, GroupDocsState>>(() => docsCache.get(cacheKey) ?? new Map());
  const groupDocsRef = useRef(groupDocs);
  groupDocsRef.current = groupDocs;
  const abortsRef = useRef(new Map<string, AbortController>());

  const fetchDocs = useCallback(async (rowId: string, record: DataTableRecord) => {
    if (groupDocsRef.current.get(rowId)?.docs) return;
    abortsRef.current.get(rowId)?.abort();
    const ctrl = new AbortController();
    abortsRef.current.set(rowId, ctrl);
    setGroupDocs((m) => new Map(m).set(rowId, { docs: null, loading: true, error: null }));
    try {
      const docs = await fetchGroupDocuments({
        subQuery: { esql: buildSubQuery(esqlQuery, byFields, record) },
        dataView, signal: ctrl.signal,
      });
      setGroupDocs((m) => new Map(m).set(rowId, { docs, loading: false, error: null }));
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setGroupDocs((m) => new Map(m).set(rowId, { docs: null, loading: false, error: err?.message ?? 'Fetch failed' }));
    } finally {
      abortsRef.current.delete(rowId);
    }
  }, [esqlQuery, byFields, dataView, fetchGroupDocuments]);

  const cancelFetch = useCallback((rowId: string) => {
    abortsRef.current.get(rowId)?.abort();
    abortsRef.current.delete(rowId);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { abortsRef.current.forEach((c) => c.abort()); }, []);

  // Persist caches
  useEffect(() => { expandCache.set(cacheKey, expandedGroups); evict(expandCache); }, [cacheKey, expandedGroups]);
  useEffect(() => { docsCache.set(cacheKey, groupDocs); evict(docsCache); }, [cacheKey, groupDocs]);

  // Reset when query changes
  const prevKeyRef = useRef(cacheKey);
  useEffect(() => {
    if (prevKeyRef.current !== cacheKey) {
      prevKeyRef.current = cacheKey;
      setExpandedGroups(expandCache.get(cacheKey) ?? new Set());
      setGroupDocs(docsCache.get(cacheKey) ?? new Map());
      abortsRef.current.forEach((c) => c.abort());
      abortsRef.current.clear();
    }
  }, [cacheKey]);

  // Stable toggle/retry/actions handlers (same reference for all rows)
  const handleToggle = useCallback((rowId: string, record: DataTableRecord) => {
    const willExpand = !expandedRef.current.has(rowId);
    toggleGroup(rowId);
    if (willExpand) fetchDocs(rowId, record); else cancelFetch(rowId);
  }, [toggleGroup, fetchDocs, cancelFetch]);

  const handleRetry = useCallback((rowId: string, record: DataTableRecord) => {
    setGroupDocs((m) => { const n = new Map(m); n.delete(rowId); return n; });
    fetchDocs(rowId, record);
  }, [fetchDocs]);

  const expandAll = useCallback(() => {
    setExpandedGroups(new Set(rows.map((r) => r.id)));
    rows.forEach((r) => fetchDocs(r.id, r));
  }, [rows, fetchDocs]);

  const collapseAll = useCallback(() => {
    abortsRef.current.forEach((c) => c.abort());
    abortsRef.current.clear();
    setExpandedGroups(new Set());
  }, []);

  // ── Context menu ──
  const popoverBtnRef = useRef<HTMLButtonElement | null>(null);
  const [popoverRow, setPopoverRow] = useState<{ id: string; record: DataTableRecord } | null>(null);
  const closePopover = useCallback(() => setPopoverRow(null), []);

  const handleActionsClick = useCallback((e: React.MouseEvent<HTMLButtonElement>, record: DataTableRecord) => {
    popoverBtnRef.current = e.currentTarget;
    setPopoverRow((prev) => prev?.id === record.id ? null : { id: record.id, record });
  }, []);

  const menuPanels = useMemo(() => {
    if (!popoverRow) return [];
    const val = byFields.map((f) => formatCellValue(popoverRow.record.flattened[f])).join(', ');
    return [{
      id: 'cascade-actions',
      items: [
        { name: 'Copy to clipboard', icon: 'copy', 'data-test-subj': 'dscCascadeRowContextActionCopyToClipboard',
          onClick: () => { copyToClipboard(val); closePopover(); } },
        ...(onFilter ? [
          { name: 'Filter in', icon: 'plusInCircle', 'data-test-subj': 'dscCascadeRowContextActionFilterIn',
            disabled: byFields.every((f) => isBlank(popoverRow.record.flattened[f])),
            onClick: () => { byFields.forEach((f) => onFilter!(f, popoverRow.record.flattened[f], '+')); closePopover(); } },
          { name: 'Filter out', icon: 'minusInCircle', 'data-test-subj': 'dscCascadeRowContextActionFilterOut',
            disabled: byFields.every((f) => isBlank(popoverRow.record.flattened[f])),
            onClick: () => { byFields.forEach((f) => onFilter!(f, popoverRow.record.flattened[f], '-')); closePopover(); } },
        ] : []),
        ...(onOpenInNewTab ? [
          { name: 'Open in new tab', icon: 'discoverApp', 'data-test-subj': 'dscCascadeRowContextActionOpenInNewTab',
            onClick: () => { onOpenInNewTab({ appState: { query: { esql: buildSubQuery(esqlQuery, byFields, popoverRow.record) } } }); closePopover(); } },
        ] : []),
      ],
    }];
  }, [popoverRow, byFields, onFilter, onOpenInNewTab, esqlQuery, closePopover]);

  // ── Virtualizer ──
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const getRowHeight = useCallback((i: number): number => {
    const r = rowsRef.current[i];
    if (!r || !expandedRef.current.has(r.id)) return GROUP_ROW_HEIGHT;
    const s = groupDocsRef.current.get(r.id);
    return (!s?.docs || !s.docs.length) ? LOADING_ROW_HEIGHT : EXPANDED_ROW_HEIGHT;
  }, []);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getRowHeight,
    overscan: OVERSCAN,
    initialOffset: scrollCache.get(cacheKey) ?? 0,
  });

  // Debounced re-measure when expansion or docs change
  const rafRef = useRef(0);
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => virtualizer.measure());
  }, [expandedGroups, groupDocs, virtualizer]);

  // Persist scroll position
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { scrollCache.set(cacheKey, el.scrollTop); evict(scrollCache); });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); el.removeEventListener('scroll', onScroll); };
  }, [cacheKey]);

  // ── Keyboard navigation ──
  const [focusIdx, setFocusIdx] = useState(-1);
  const focusRef = useRef(focusIdx);
  focusRef.current = focusIdx;

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    const r = rowsRef.current;
    const len = r.length;
    if (!len) return;
    const idx = focusRef.current;
    let next = idx;
    const row = r[idx];
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); next = Math.min(idx + 1, len - 1); break;
      case 'ArrowUp':   e.preventDefault(); next = Math.max(idx - 1, 0); break;
      case 'Home':      e.preventDefault(); next = 0; break;
      case 'End':       e.preventDefault(); next = len - 1; break;
      case 'ArrowRight': e.preventDefault(); if (row && !expandedRef.current.has(row.id)) handleToggle(row.id, row); return;
      case 'ArrowLeft':  e.preventDefault(); if (row && expandedRef.current.has(row.id)) handleToggle(row.id, row); return;
      default: return;
    }
    if (next !== idx) {
      setFocusIdx(next);
      virtualizer.scrollToIndex(next, { align: 'auto' });
      requestAnimationFrame(() => {
        (parentRef.current?.querySelector(`[data-row-id="${r[next]?.id}"]`) as HTMLElement | null)?.focus();
      });
    }
  }, [handleToggle, virtualizer]);

  // ── Full screen ──
  const [fullScreen, setFullScreen] = useState(false);

  const items = virtualizer.getVirtualItems();
  const loading = loadingState === DataLoadingState.loading;
  const empty = !loading && !rows.length;
  const total = rows.length;

  return (
    <div css={[styles.wrapper, fullScreen && styles.fullScreen]} data-test-subj="tanstackCascadeWrapper">
      {/* Toolbar */}
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false} css={styles.toolbar}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s"><strong><span data-test-subj="discoverQueryHits">{total.toLocaleString()}</span> {total === 1 ? 'group' : 'groups'}</strong></EuiText>
            </EuiFlexItem>
            {expandedGroups.size > 0 && (
              <EuiFlexItem grow={false}><EuiBadge color="accent">{expandedGroups.size} expanded</EuiBadge></EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Expand all groups">
                <EuiButtonIcon iconType="unfold" aria-label="Expand all groups" size="xs" onClick={expandAll} data-test-subj="cascadeExpandAll" />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content="Collapse all groups">
                <EuiButtonIcon iconType="fold" aria-label="Collapse all groups" size="xs" onClick={collapseAll} disabled={!expandedGroups.size} data-test-subj="cascadeCollapseAll" />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={fullScreen ? 'Exit full screen' : 'Full screen'}>
                <EuiButtonIcon iconType={fullScreen ? 'fullScreenExit' : 'fullScreen'} aria-label={fullScreen ? 'Exit full screen' : 'Full screen'}
                  size="xs" onClick={() => setFullScreen((p) => !p)} data-test-subj="cascadeFullScreenButton" />
              </EuiToolTip>
            </EuiFlexItem>
            {availableCascadeGroups?.length && onCascadeGroupingChange ? (
              <EuiFlexItem grow={false}>
                <GroupBySelector availableColumns={availableCascadeGroups} currentSelectedColumns={selectedCascadeGroups ?? []} onChange={onCascadeGroupingChange} />
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Content */}
      <div css={styles.contentArea}>
        {empty ? (
          <EuiEmptyPrompt css={styles.emptyState} iconType="discoverApp" title={<h3>No groups found</h3>} body="The query returned no STATS...BY results." data-test-subj="cascadeNoResults" />
        ) : (
          <div ref={parentRef} css={styles.scrollContainer} role="treegrid" aria-label="Cascade document groups" aria-readonly="true" tabIndex={0} onKeyDown={onKeyDown}>
            <div css={styles.virtualOuter} style={{ height: virtualizer.getTotalSize() }}>
              <div css={styles.virtualInner} style={{ transform: `translateY(${items[0]?.start ?? 0}px)` }}>
                {items.map((vi) => {
                  const row = rows[vi.index];
                  const expanded = expandedGroups.has(row.id);
                  const ds = groupDocs.get(row.id);
                  return (
                    <div key={row.id} data-index={vi.index} role="rowgroup">
                      <CascadeGroupRow
                        record={row} isExpanded={expanded}
                        onToggle={handleToggle} onActionsClick={handleActionsClick}
                        byFields={byFields} aggregateColumns={aggCols} styles={styles}
                        index={vi.index} totalRows={total}
                      />
                      {ds?.loading && !ds.docs && <EuiProgress size="xs" color="accent" />}
                      {expanded && ds && (
                        <ExpandedGroupGrid state={ds} dataView={dataView} showTimeCol={showTimeCol}
                          renderDocumentView={renderDocumentView} externalCustomRenderers={externalCustomRenderers}
                          styles={styles} rowId={row.id} onRetry={() => handleRetry(row.id, row)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {loading && <div css={styles.loadingOverlay}><EuiLoadingSpinner size="xl" /></div>}
          </div>
        )}
      </div>

      {/* Context menu popover */}
      {popoverRow && popoverBtnRef.current && (
        <EuiWrappingPopover button={popoverBtnRef.current} isOpen closePopover={closePopover} panelPaddingSize="none" anchorPosition="upLeft">
          <EuiContextMenu initialPanelId="cascade-actions" panels={menuPanels} data-test-subj="cascadeContextMenu" />
        </EuiWrappingPopover>
      )}
    </div>
  );
});

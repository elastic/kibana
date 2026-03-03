/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnSizingState,
  type RowData,
  type Row,
  type Cell,
} from '@tanstack/react-table';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCheckbox,
  EuiContextMenu,
  EuiEmptyPrompt,
  EuiFieldNumber,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  keys,
  useEuiTheme,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord, DataTableColumnsMeta } from '@kbn/discover-utils';
import { getShouldShowFieldHandler, formatFieldValue } from '@kbn/discover-utils';
import { FieldIcon, getFieldIconProps, getTextBasedColumnIconType } from '@kbn/field-utils';
import {
  SourceDocument,
  DataLoadingState,
  type UnifiedDataTableProps,
  type SortOrder,
} from '@kbn/unified-data-table';
import type { AggregateQuery } from '@kbn/es-query';
import {
  getTanStackDataGridStyles,
  CONTROL_COL_WIDTH,
  SELECT_COL_WIDTH,
  DEFAULT_COL_WIDTH,
  MIN_COL_WIDTH,
} from './tanstack_data_grid.styles';
import { useDiscoverServices } from '../../../hooks/use_discover_services';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    isControl?: boolean;
    isSelect?: boolean;
    isSummary?: boolean;
    isTimestamp?: boolean;
    fieldName?: string;
  }
}

export interface TanStackDataGridProps {
  rows: DataTableRecord[];
  columns: string[];
  columnsMeta?: DataTableColumnsMeta;
  dataView: DataView;
  query?: AggregateQuery;
  showTimeCol: boolean;
  isPlainRecord?: boolean;
  showColumnTokens?: boolean;

  sort?: SortOrder[];
  onSort?: (sort: SortOrder[]) => void;
  isSortEnabled?: boolean;

  settings?: UnifiedDataTableProps['settings'];
  onResize?: UnifiedDataTableProps['onResize'];
  onSetColumns?: UnifiedDataTableProps['onSetColumns'];

  expandedDoc?: DataTableRecord;
  setExpandedDoc?: UnifiedDataTableProps['setExpandedDoc'];
  renderDocumentView?: UnifiedDataTableProps['renderDocumentView'];

  loadingState?: DataLoadingState;
  onFilter?: UnifiedDataTableProps['onFilter'];
  getRowIndicator?: UnifiedDataTableProps['getRowIndicator'];
  rowAdditionalLeadingControls?: UnifiedDataTableProps['rowAdditionalLeadingControls'];

  dataGridDensityState?: UnifiedDataTableProps['dataGridDensityState'];
  onUpdateDataGridDensity?: UnifiedDataTableProps['onUpdateDataGridDensity'];
  rowHeightState?: number;
  onUpdateRowHeight?: UnifiedDataTableProps['onUpdateRowHeight'];
  headerRowHeightState?: number;
  onUpdateHeaderRowHeight?: UnifiedDataTableProps['onUpdateHeaderRowHeight'];
  externalAdditionalControls?: React.ReactNode;
}

type GridDensity = 'compact' | 'normal' | 'expanded';

interface DensityConfig {
  rowHeight: number;
  summaryRowHeight: number;
  fontSize: number;
  cellPaddingV: number;
  cellPaddingH: number;
  label: string;
  icon: string;
}

const DENSITY_CONFIG: Record<GridDensity, DensityConfig> = {
  compact: {
    rowHeight: 28,
    summaryRowHeight: 70,
    fontSize: 12,
    cellPaddingV: 2,
    cellPaddingH: 6,
    label: 'Compact',
    icon: 'menuLeft',
  },
  normal: {
    rowHeight: 34,
    summaryRowHeight: 90,
    fontSize: 14,
    cellPaddingV: 4,
    cellPaddingH: 8,
    label: 'Normal',
    icon: 'menu',
  },
  expanded: {
    rowHeight: 44,
    summaryRowHeight: 120,
    fontSize: 14,
    cellPaddingV: 8,
    cellPaddingH: 12,
    label: 'Expanded',
    icon: 'menuRight',
  },
};

const DENSITY_BUTTONS = [
  { id: 'compact' as GridDensity, label: 'Compact', iconType: 'menuLeft' },
  { id: 'normal' as GridDensity, label: 'Normal', iconType: 'menu' },
  { id: 'expanded' as GridDensity, label: 'Expanded', iconType: 'menuRight' },
];

const GROUP_SUB_ROW_HEIGHT = 28;
const GROUP_SUB_PANEL_HEADER = 30;
const MAX_GROUP_SUB_ROWS = 5;
const OVERSCAN = 20;
const MAX_SUMMARY_FIELDS = 80;

const scrollPositionCache = new Map<string, number>();

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
};

const formatTimestamp = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') {
    try {
      return new Date(value).toISOString();
    } catch {
      return value;
    }
  }
  return String(value);
};

const filterNullFields = (row: DataTableRecord): DataTableRecord => {
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row.flattened)) {
    if (value !== null && value !== undefined) {
      filtered[key] = value;
    }
  }
  return { ...row, flattened: filtered };
};

// ── Find in table ──
interface FindMatch {
  rowIndex: number;
  fieldName: string;
}

function scanMatches(
  rows: DataTableRecord[],
  fields: string[],
  term: string,
  isSummaryMode: boolean
): FindMatch[] {
  if (!term) return [];
  const lower = term.toLowerCase();
  const matches: FindMatch[] = [];

  for (let ri = 0; ri < rows.length; ri++) {
    const flat = rows[ri].flattened;
    if (isSummaryMode) {
      for (const [key, val] of Object.entries(flat)) {
        if (val !== null && val !== undefined && formatCellValue(val).toLowerCase().includes(lower)) {
          matches.push({ rowIndex: ri, fieldName: key });
        }
      }
    } else {
      for (const f of fields) {
        if (formatCellValue(flat[f]).toLowerCase().includes(lower)) {
          matches.push({ rowIndex: ri, fieldName: f });
        }
      }
    }
  }
  return matches;
}

const HighlightedText = React.memo(
  ({
    text,
    term,
    isActive,
    styles,
  }: {
    text: string;
    term: string;
    isActive: boolean;
    styles: ReturnType<typeof getTanStackDataGridStyles>;
  }) => {
    if (!term) return <>{text}</>;
    const lower = text.toLowerCase();
    const tLower = term.toLowerCase();
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    let idx = lower.indexOf(tLower, cursor);

    while (idx !== -1) {
      if (idx > cursor) parts.push(text.slice(cursor, idx));
      parts.push(
        <mark key={idx} css={isActive ? styles.searchHighlightActive : styles.searchHighlight}>
          {text.slice(idx, idx + term.length)}
        </mark>
      );
      cursor = idx + term.length;
      idx = lower.indexOf(tLower, cursor);
    }
    if (cursor < text.length) parts.push(text.slice(cursor));
    return <>{parts}</>;
  }
);

const FindInTableBar = React.memo(
  ({
    matchesCount,
    activeIndex,
    onSearch,
    onNext,
    onPrev,
    onClose,
    styles,
  }: {
    matchesCount: number;
    activeIndex: number;
    onSearch: (term: string) => void;
    onNext: () => void;
    onPrev: () => void;
    onClose: () => void;
    styles: ReturnType<typeof getTanStackDataGridStyles>;
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setInputValue(v);
        onSearch(v);
      },
      [onSearch]
    );

    const handleKeyUp = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === keys.ESCAPE) {
          onClose();
        } else if (e.key === keys.ENTER && e.shiftKey) {
          onPrev();
        } else if (e.key === keys.ENTER) {
          onNext();
        }
      },
      [onClose, onPrev, onNext]
    );

    const hasResults = matchesCount > 0;
    const counter = inputValue
      ? `${hasResults ? activeIndex + 1 : 0}/${matchesCount}`
      : '';

    return (
      <div css={styles.findBar} data-test-subj="findInTableBar">
        <EuiFieldSearch
          inputRef={(node) => {
            (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
          }}
          compressed
          css={styles.findInput}
          placeholder="Find in table"
          value={inputValue}
          onChange={handleChange}
          onKeyUp={handleKeyUp}
          data-test-subj="findInTableInput"
          isClearable
          aria-label="Find in table"
        />
        <EuiText size="xs" css={styles.findCounter} data-test-subj="findInTableCounter">
          {counter}
        </EuiText>
        <EuiButtonIcon
          iconType="arrowUp"
          size="xs"
          color="text"
          disabled={!hasResults}
          aria-label="Previous match"
          onClick={onPrev}
          data-test-subj="findInTablePrev"
        />
        <EuiButtonIcon
          iconType="arrowDown"
          size="xs"
          color="text"
          disabled={!hasResults}
          aria-label="Next match"
          onClick={onNext}
          data-test-subj="findInTableNext"
        />
        <EuiButtonIcon
          iconType="cross"
          size="xs"
          color="text"
          aria-label="Close find bar"
          onClick={onClose}
          data-test-subj="findInTableClose"
        />
      </div>
    );
  }
);

const EXPAND_COLUMN_ID = '__expand';
const SELECT_COLUMN_ID = '__select';
const SOURCE_COLUMN_ID = '_source';

// -- STATS ... BY column reordering --
interface StatsByInfo {
  byFields: string[];
  orderedColumns: string[];
}

const parseStatsByColumns = (
  query: AggregateQuery | undefined,
  columns: string[]
): StatsByInfo | undefined => {
  if (!query || !('esql' in query)) return undefined;
  const byMatch = query.esql.match(/\bSTATS\b[\s\S]+?\bBY\b\s+(.+?)(?:\||$)/i);
  if (!byMatch) return undefined;

  const byClause = byMatch[1].replace(/\/\/.*$|\/\*[\s\S]*?\*\//g, '');

  const byFields = byClause
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
  if (byFields.length === 0) return undefined;

  const bySet = new Set(byFields);
  const countFields: string[] = [];
  const otherFields: string[] = [];

  for (const col of columns) {
    if (col === SOURCE_COLUMN_ID || bySet.has(col)) continue;
    if (/count/i.test(col)) {
      countFields.push(col);
    } else {
      otherFields.push(col);
    }
  }

  const orderedColumns = [...byFields, ...countFields, ...otherFields].filter((col) =>
    columns.includes(col)
  );
  return { byFields, orderedColumns };
};

// ── Marvel placeholder data for grouped mode sub-rows ──
interface MarvelCharacter {
  name: string;
  realName: string;
  team: string;
  power: number;
  firstAppearance: number;
}

const MARVEL_CHARACTERS: MarvelCharacter[] = [
  { name: 'Spider-Man', realName: 'Peter Parker', team: 'Avengers', power: 87, firstAppearance: 1962 },
  { name: 'Iron Man', realName: 'Tony Stark', team: 'Avengers', power: 95, firstAppearance: 1963 },
  { name: 'Wolverine', realName: 'Logan', team: 'X-Men', power: 88, firstAppearance: 1974 },
  { name: 'Storm', realName: 'Ororo Munroe', team: 'X-Men', power: 90, firstAppearance: 1975 },
  { name: 'Captain America', realName: 'Steve Rogers', team: 'Avengers', power: 82, firstAppearance: 1941 },
  { name: 'Black Widow', realName: 'Natasha Romanoff', team: 'Avengers', power: 75, firstAppearance: 1964 },
  { name: 'Thor', realName: 'Thor Odinson', team: 'Asgardians', power: 99, firstAppearance: 1962 },
  { name: 'Hulk', realName: 'Bruce Banner', team: 'Avengers', power: 98, firstAppearance: 1962 },
  { name: 'Cyclops', realName: 'Scott Summers', team: 'X-Men', power: 78, firstAppearance: 1963 },
  { name: 'Jean Grey', realName: 'Jean Grey', team: 'X-Men', power: 96, firstAppearance: 1963 },
  { name: 'Deadpool', realName: 'Wade Wilson', team: 'X-Force', power: 85, firstAppearance: 1991 },
  { name: 'Black Panther', realName: "T'Challa", team: 'Avengers', power: 88, firstAppearance: 1966 },
  { name: 'Doctor Strange', realName: 'Stephen Strange', team: 'Avengers', power: 97, firstAppearance: 1963 },
  { name: 'Scarlet Witch', realName: 'Wanda Maximoff', team: 'Avengers', power: 99, firstAppearance: 1964 },
  { name: 'Gambit', realName: 'Remy LeBeau', team: 'X-Men', power: 80, firstAppearance: 1990 },
  { name: 'Rogue', realName: 'Anna Marie', team: 'X-Men', power: 92, firstAppearance: 1981 },
  { name: 'Vision', realName: 'Vision', team: 'Avengers', power: 91, firstAppearance: 1968 },
  { name: 'Hawkeye', realName: 'Clint Barton', team: 'Avengers', power: 70, firstAppearance: 1964 },
  { name: 'Ant-Man', realName: 'Scott Lang', team: 'Avengers', power: 72, firstAppearance: 1979 },
  { name: 'Wasp', realName: 'Janet Van Dyne', team: 'Avengers', power: 74, firstAppearance: 1963 },
];

const MARVEL_FIELDS: (keyof MarvelCharacter)[] = ['name', 'realName', 'team', 'power', 'firstAppearance'];

const getMarvelSubRows = (rowIndex: number): MarvelCharacter[] => {
  const count = 2 + (rowIndex % (MAX_GROUP_SUB_ROWS - 1));
  const start = (rowIndex * 7) % MARVEL_CHARACTERS.length;
  const result: MarvelCharacter[] = [];
  for (let i = 0; i < count; i++) {
    result.push(MARVEL_CHARACTERS[(start + i) % MARVEL_CHARACTERS.length]);
  }
  return result;
};

// ── Cell Actions: filter in/out, copy, expand ──
const CellActions = React.memo(
  ({
    fieldName,
    value,
    onFilter,
    onExpand,
    styles,
  }: {
    fieldName: string;
    value: unknown;
    onFilter?: UnifiedDataTableProps['onFilter'];
    onExpand: () => void;
    styles: ReturnType<typeof getTanStackDataGridStyles>;
  }) => {
    const handleFilterIn = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onFilter?.(fieldName, value, '+');
      },
      [onFilter, fieldName, value]
    );
    const handleFilterOut = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onFilter?.(fieldName, value, '-');
      },
      [onFilter, fieldName, value]
    );
    const handleCopy = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(formatCellValue(value));
      },
      [value]
    );
    const handleExpand = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onExpand();
      },
      [onExpand]
    );

    return (
      <div className="tsg-cellActions" css={styles.cellActions}>
        {onFilter && (
          <>
            <EuiToolTip content="Filter for value">
              <EuiButtonIcon
                iconType="plusInCircle"
                aria-label="Filter for value"
                size="xs"
                iconSize="s"
                color="text"
                onClick={handleFilterIn}
                data-test-subj="filterForValue"
              />
            </EuiToolTip>
            <EuiToolTip content="Filter out value">
              <EuiButtonIcon
                iconType="minusInCircle"
                aria-label="Filter out value"
                size="xs"
                iconSize="s"
                color="text"
                onClick={handleFilterOut}
                data-test-subj="filterOutValue"
              />
            </EuiToolTip>
          </>
        )}
        <EuiToolTip content="Copy value">
          <EuiButtonIcon
            iconType="copyClipboard"
            aria-label="Copy value"
            size="xs"
            iconSize="s"
            color="text"
            onClick={handleCopy}
            data-test-subj="copyCellValue"
          />
        </EuiToolTip>
        <EuiToolTip content="Expand cell">
          <EuiButtonIcon
            iconType="expand"
            aria-label="Expand cell"
            size="xs"
            iconSize="s"
            color="text"
            onClick={handleExpand}
            data-test-subj="expandCellValue"
          />
        </EuiToolTip>
      </div>
    );
  }
);

// ── Cell Popover ──
const CellPopover = React.memo(
  ({
    fieldName,
    value,
    anchorRect,
    onClose,
    onFilter,
    styles,
  }: {
    fieldName: string;
    value: unknown;
    anchorRect: DOMRect;
    onClose: () => void;
    onFilter?: UnifiedDataTableProps['onFilter'];
    styles: ReturnType<typeof getTanStackDataGridStyles>;
  }) => {
    const formatted = formatCellValue(value);
    const top = Math.min(anchorRect.bottom + 4, window.innerHeight - 420);
    const left = Math.min(anchorRect.left, window.innerWidth - 520);

    useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleCopy = useCallback(() => {
      navigator.clipboard.writeText(formatted);
    }, [formatted]);

    return (
      <>
        <div css={styles.cellPopoverBackdrop} onClick={onClose} />
        <div
          css={styles.cellPopover}
          style={{ top, left }}
          data-test-subj="cellPopover"
          role="dialog"
          aria-label={`${fieldName} value`}
        >
          <div css={styles.cellPopoverHeader}>
            <span>{fieldName}</span>
            <div css={{ display: 'flex', gap: 2 }}>
              {onFilter && (
                <>
                  <EuiToolTip content="Filter for value">
                    <EuiButtonIcon
                      iconType="plusInCircle"
                      aria-label="Filter for value"
                      size="xs"
                      onClick={() => { onFilter(fieldName, value, '+'); onClose(); }}
                    />
                  </EuiToolTip>
                  <EuiToolTip content="Filter out value">
                    <EuiButtonIcon
                      iconType="minusInCircle"
                      aria-label="Filter out value"
                      size="xs"
                      onClick={() => { onFilter(fieldName, value, '-'); onClose(); }}
                    />
                  </EuiToolTip>
                </>
              )}
              <EuiToolTip content="Copy value">
                <EuiButtonIcon
                  iconType="copyClipboard"
                  aria-label="Copy value"
                  size="xs"
                  onClick={handleCopy}
                />
              </EuiToolTip>
              <EuiButtonIcon
                iconType="cross"
                aria-label="Close"
                size="xs"
                onClick={onClose}
              />
            </div>
          </div>
          <div css={styles.cellPopoverBody}>{formatted}</div>
        </div>
      </>
    );
  }
);

// ── Grouped sub-panel ──
const GroupSubPanel = React.memo(
  ({
    rowIndex,
    styles,
    width,
  }: {
    rowIndex: number;
    styles: ReturnType<typeof getTanStackDataGridStyles>;
    width: number;
  }) => {
    const characters = useMemo(() => getMarvelSubRows(rowIndex), [rowIndex]);
    return (
      <div css={styles.groupSubPanel} style={{ width }} data-test-subj="groupSubPanel">
        <table css={styles.subTable}>
          <thead css={styles.subTableHeader}>
            <tr>
              {MARVEL_FIELDS.map((field) => (
                <th key={field}>{field}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {characters.map((char, i) => (
              <tr key={`${char.name}-${i}`} css={styles.subTableRow}>
                <td>
                  <strong>{char.name}</strong>
                </td>
                <td>{char.realName}</td>
                <td>
                  <EuiBadge color="hollow" css={styles.subTableBadge}>
                    {char.team}
                  </EuiBadge>
                </td>
                <td>{char.power}</td>
                <td>{char.firstAppearance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

// ── Memoized virtual row ──
const VirtualRow = React.memo(
  ({
    row,
    virtualRow,
    isExpanded,
    isSelected,
    indicatorColor,
    rowHeight,
    styles,
    focusedColIndex,
    rowIndex,
    onFilter,
    setPopoverState,
    findTerm,
    findActiveMatch,
  }: {
    row: Row<DataTableRecord>;
    virtualRow: VirtualItem;
    isExpanded: boolean;
    isSelected: boolean;
    indicatorColor: string | undefined;
    rowHeight: number;
    styles: ReturnType<typeof getTanStackDataGridStyles>;
    focusedColIndex: number | null;
    rowIndex: number;
    onFilter?: UnifiedDataTableProps['onFilter'];
    setPopoverState?: (state: { fieldName: string; value: unknown; rect: DOMRect } | null) => void;
    findTerm?: string;
    findActiveMatch?: FindMatch | null;
  }) => {
    const cells = row.getVisibleCells();
    return (
      <div
        data-index={virtualRow.index}
        style={{ height: rowHeight }}
        role="row"
        aria-rowindex={rowIndex + 2}
        aria-selected={isSelected}
        tabIndex={-1}
      >
        <div
          css={[styles.row, isExpanded && styles.rowExpanded, isSelected && styles.selectedRow]}
          style={{
            borderLeft: indicatorColor ? `3px solid ${indicatorColor}` : undefined,
          }}
        >
          {cells.map((cell, colIdx) => (
            <VirtualCell
              key={cell.id}
              cell={cell}
              styles={styles}
              isFocused={focusedColIndex === colIdx}
              onFilter={onFilter}
              setPopoverState={setPopoverState}
              findTerm={findTerm}
              findActiveMatch={findActiveMatch}
              rowIndex={virtualRow.index}
            />
          ))}
        </div>
      </div>
    );
  }
);

// ── Grouped virtual row ──
const GroupedVirtualRow = React.memo(
  ({
    row,
    virtualRow,
    isGroupExpanded,
    onToggleGroup,
    byFields,
    aggregateColumns,
    styles,
    totalWidth,
    groupRowHeight,
  }: {
    row: Row<DataTableRecord>;
    virtualRow: VirtualItem;
    isGroupExpanded: boolean;
    onToggleGroup: (rowId: string) => void;
    byFields: string[];
    aggregateColumns: string[];
    styles: ReturnType<typeof getTanStackDataGridStyles>;
    totalWidth: number;
    groupRowHeight: number;
  }) => {
    const record = row.original;
    const handleClick = useCallback(() => onToggleGroup(row.id), [onToggleGroup, row.id]);
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggleGroup(row.id);
        }
      },
      [onToggleGroup, row.id]
    );

    const subRowCount = 2 + (virtualRow.index % (MAX_GROUP_SUB_ROWS - 1));

    return (
      <div
        data-index={virtualRow.index}
        role="row"
        tabIndex={0}
        data-test-subj="groupRow"
      >
        <div
          css={[styles.groupRow, isGroupExpanded && styles.groupRowExpanded]}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          style={{ width: totalWidth, height: groupRowHeight }}
          data-test-subj="groupRowHeader"
        >
          <div
            css={[styles.groupChevronCell, isGroupExpanded && styles.groupChevronRotated]}
          >
            <EuiIcon type="arrowRight" size="s" />
          </div>
          <div css={styles.groupLabel}>
            {byFields.map((field) => (
              <span key={field}>
                <span css={styles.groupLabelField}>{field}:</span>{' '}
                <strong>{formatCellValue(record.flattened[field])}</strong>
              </span>
            ))}
            {aggregateColumns.map((col) => (
              <EuiBadge key={col} color="hollow">
                {col}: {formatCellValue(record.flattened[col])}
              </EuiBadge>
            ))}
          </div>
          <div css={styles.groupCount}>{subRowCount} documents</div>
        </div>
        {isGroupExpanded && (
          <GroupSubPanel
            rowIndex={virtualRow.index}
            styles={styles}
            width={totalWidth}
          />
        )}
      </div>
    );
  }
);

// ── Virtual cell with cell actions, popover, and focus support ──
const VirtualCell = React.memo(
  ({
    cell,
    styles,
    isFocused,
    onFilter,
    setPopoverState,
    findTerm,
    findActiveMatch,
    rowIndex,
  }: {
    cell: Cell<DataTableRecord, unknown>;
    styles: ReturnType<typeof getTanStackDataGridStyles>;
    isFocused: boolean;
    onFilter?: UnifiedDataTableProps['onFilter'];
    setPopoverState?: (state: { fieldName: string; value: unknown; rect: DOMRect } | null) => void;
    findTerm?: string;
    findActiveMatch?: FindMatch | null;
    rowIndex?: number;
  }) => {
    const isControl = cell.column.columnDef.meta?.isControl;
    const isSelect = cell.column.columnDef.meta?.isSelect;
    const isSummary = cell.column.columnDef.meta?.isSummary;

    if (isControl || isSelect) {
      return (
        <div
          css={[isSelect ? styles.selectCell : styles.controlCell, isFocused && styles.focusedCell]}
          style={{ width: cell.column.getSize() }}
          role="gridcell"
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      );
    }

    if (isSummary) {
      return (
        <div
          css={[styles.summaryCell, styles.expandableCell, isFocused && styles.focusedCell]}
          role="gridcell"
          style={{ flex: '1 1 0' }}
          onClick={(e) => {
            if (setPopoverState) {
              const el = e.currentTarget;
              setPopoverState({
                fieldName: '_source',
                value: Object.entries(cell.row.original.flattened)
                  .map(([k, v]) => `${k}: ${formatCellValue(v)}`)
                  .join('\n'),
                rect: el.getBoundingClientRect(),
              });
            }
          }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      );
    }

    const fieldName = cell.column.columnDef.meta?.fieldName;
    const value = cell.getValue();
    const colId = cell.column.id;
    const rowId = cell.row.original.id;
    const formatted = formatCellValue(value);
    const isActiveHighlight =
      findTerm && findActiveMatch && findActiveMatch.rowIndex === rowIndex && findActiveMatch.fieldName === colId;

    const openCellPopover = (el: HTMLElement) => {
      if (fieldName && setPopoverState) {
        setPopoverState({
          fieldName,
          value,
          rect: el.getBoundingClientRect(),
        });
      }
    };

    return (
      <div
        css={[styles.cell, styles.cellWithActions, styles.expandableCell, isFocused && styles.focusedCell]}
        style={{ width: cell.column.getSize() }}
        role="gridcell"
        data-row-id={rowId}
        data-col-id={colId}
        onClick={(e) => openCellPopover(e.currentTarget)}
      >
        <div css={styles.cellContent}>
          {findTerm ? (
            <HighlightedText
              text={formatted}
              term={findTerm}
              isActive={Boolean(isActiveHighlight)}
              styles={styles}
            />
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </div>
        {fieldName && (
          <CellActions
            fieldName={fieldName}
            value={value}
            onFilter={onFilter}
            onExpand={() => {
              const el = document.querySelector(
                `[data-row-id="${rowId}"][data-col-id="${colId}"]`
              );
              if (el) openCellPopover(el as HTMLElement);
            }}
            styles={styles}
          />
        )}
      </div>
    );
  }
);

const SummaryCellContent = React.memo(
  ({
    row,
    dataView,
    shouldShowFieldHandler,
    fieldFormats,
    columnsMeta,
  }: {
    row: DataTableRecord;
    dataView: DataView;
    shouldShowFieldHandler: (fieldName: string) => boolean;
    fieldFormats: ReturnType<typeof useDiscoverServices>['fieldFormats'];
    columnsMeta: DataTableColumnsMeta | undefined;
  }) => {
    const filteredRow = useMemo(() => filterNullFields(row), [row]);
    return (
      <SourceDocument
        useTopLevelObjectColumns={false}
        row={filteredRow}
        columnId={SOURCE_COLUMN_ID}
        dataView={dataView}
        shouldShowFieldHandler={shouldShowFieldHandler}
        maxEntries={MAX_SUMMARY_FIELDS}
        fieldFormats={fieldFormats}
        columnsMeta={columnsMeta}
        isCompressed
      />
    );
  }
);

export const TanStackDataGrid: React.FC<TanStackDataGridProps> = React.memo(
  ({
    rows,
    columns,
    columnsMeta,
    dataView,
    query,
    showTimeCol,
    isPlainRecord,
    showColumnTokens,
    sort = [],
    onSort,
    isSortEnabled = true,
    settings,
    onResize,
    onSetColumns,
    expandedDoc,
    setExpandedDoc,
    renderDocumentView,
    loadingState,
    onFilter,
    getRowIndicator,
    rowAdditionalLeadingControls,
    dataGridDensityState,
    onUpdateDataGridDensity,
    rowHeightState,
    onUpdateRowHeight,
    headerRowHeightState,
    onUpdateHeaderRowHeight,
    externalAdditionalControls,
  }) => {
    const { euiTheme } = useEuiTheme();
    const { fieldFormats } = useDiscoverServices();
    const parentRef = useRef<HTMLDivElement | null>(null);
    const styles = useMemo(() => getTanStackDataGridStyles(euiTheme), [euiTheme]);

    const scrollKey = dataView.id ?? dataView.title;
    const timeFieldName = dataView.timeFieldName;

    // ── Find in table ──
    const [isFindOpen, setIsFindOpen] = useState(false);
    const [findTerm, setFindTerm] = useState('');
    const [findActiveIndex, setFindActiveIndex] = useState(0);

    const isSummaryMode =
      columns.length === 0 ||
      (columns.length === 1 && columns[0] === SOURCE_COLUMN_ID) ||
      (columns.length === 1 && columns[0] === timeFieldName);

    // STATS ... BY column reordering
    const statsByInfo = useMemo(
      () => (!isSummaryMode ? parseStatsByColumns(query, columns) : undefined),
      [query, columns, isSummaryMode]
    );
    const effectiveColumns = statsByInfo?.orderedColumns ?? columns;

    // Find matches
    const findMatches = useMemo(
      () => scanMatches(rows, effectiveColumns, findTerm, isSummaryMode),
      [rows, effectiveColumns, findTerm, isSummaryMode]
    );
    const findActiveMatch = findMatches[findActiveIndex] ?? null;

    const handleFindSearch = useCallback((term: string) => {
      setFindTerm(term);
      setFindActiveIndex(0);
    }, []);
    const handleFindNext = useCallback(() => {
      setFindActiveIndex((prev) => (findMatches.length === 0 ? 0 : (prev + 1) % findMatches.length));
    }, [findMatches.length]);
    const handleFindPrev = useCallback(() => {
      setFindActiveIndex((prev) =>
        findMatches.length === 0 ? 0 : (prev - 1 + findMatches.length) % findMatches.length
      );
    }, [findMatches.length]);
    const handleFindClose = useCallback(() => {
      setIsFindOpen(false);
      setFindTerm('');
      setFindActiveIndex(0);
    }, []);

    // Grouped mode
    const isGroupedMode = Boolean(statsByInfo);
    const aggregateColumns = useMemo(() => {
      if (!statsByInfo) return [];
      const bySet = new Set(statsByInfo.byFields);
      return effectiveColumns.filter((c) => !bySet.has(c));
    }, [statsByInfo, effectiveColumns]);

    const [groupExpandedSet, setGroupExpandedSet] = useState<Set<string>>(new Set());
    const toggleGroupExpand = useCallback((rowId: string) => {
      setGroupExpandedSet((prev) => {
        const next = new Set(prev);
        if (next.has(rowId)) {
          next.delete(rowId);
        } else {
          next.add(rowId);
        }
        return next;
      });
    }, []);

    const shouldShowFieldHandler = useMemo(() => {
      const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
      return getShouldShowFieldHandler(dataViewFields, dataView, true);
    }, [dataView]);

    // ── Row selection ──
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const allSelected = rows.length > 0 && selectedRows.size === rows.length;
    const someSelected = selectedRows.size > 0 && !allSelected;

    const toggleSelectRow = useCallback((rowId: string) => {
      setSelectedRows((prev) => {
        const next = new Set(prev);
        if (next.has(rowId)) {
          next.delete(rowId);
        } else {
          next.add(rowId);
        }
        return next;
      });
    }, []);

    const toggleSelectAll = useCallback(() => {
      setSelectedRows((prev) => {
        if (prev.size === rows.length) return new Set();
        return new Set(rows.map((r) => r.id));
      });
    }, [rows]);

    const clearSelection = useCallback(() => setSelectedRows(new Set()), []);

    const selectedRowsRef = useRef(selectedRows);
    selectedRowsRef.current = selectedRows;

    const toggleSelectRowRef = useRef(toggleSelectRow);
    toggleSelectRowRef.current = toggleSelectRow;

    // ── Full-screen mode ──
    const [isFullScreen, setIsFullScreen] = useState(false);
    const toggleFullScreen = useCallback(() => setIsFullScreen((prev) => !prev), []);

    // ── Grid density (sync with app state if provided) ──
    const [localDensity, setLocalDensity] = useState<GridDensity>(
      (dataGridDensityState as GridDensity) || 'compact'
    );
    const density = (dataGridDensityState as GridDensity) || localDensity;
    const setDensity = useCallback(
      (d: GridDensity) => {
        setLocalDensity(d);
        onUpdateDataGridDensity?.(d as any);
      },
      [onUpdateDataGridDensity]
    );
    const [isDensityPopoverOpen, setIsDensityPopoverOpen] = useState(false);
    const densityCfg = DENSITY_CONFIG[density];

    // ── Max header cell lines (sync with app state) ──
    const [localHeaderMaxLines, setLocalHeaderMaxLines] = useState(headerRowHeightState ?? 1);
    const headerMaxLines = headerRowHeightState ?? localHeaderMaxLines;
    const setHeaderMaxLines = useCallback(
      (val: number) => {
        setLocalHeaderMaxLines(val);
        onUpdateHeaderRowHeight?.(val);
      },
      [onUpdateHeaderRowHeight]
    );

    // ── Body cell lines (sync with app state) ──
    const [localBodyMaxLines, setLocalBodyMaxLines] = useState(rowHeightState ?? 1);
    const bodyMaxLines = rowHeightState ?? localBodyMaxLines;
    const setBodyMaxLines = useCallback(
      (val: number) => {
        setLocalBodyMaxLines(val);
        onUpdateRowHeight?.(val);
      },
      [onUpdateRowHeight]
    );

    // ── Cell popover ──
    const [popoverState, setPopoverState] = useState<{
      fieldName: string;
      value: unknown;
      rect: DOMRect;
    } | null>(null);
    const closePopover = useCallback(() => setPopoverState(null), []);

    const popoverStateRef = useRef(popoverState);
    popoverStateRef.current = popoverState;
    const closePopoverRef = useRef(closePopover);
    closePopoverRef.current = closePopover;

    // ── Keyboard navigation ──
    const [focusedCell, setFocusedCell] = useState<{ row: number; col: number } | null>(null);
    const focusedCellRef = useRef(focusedCell);
    focusedCellRef.current = focusedCell;

    // ── Column drag & drop reorder ──
    const [dragState, setDragState] = useState<{
      dragging: string | null;
      over: string | null;
    }>({ dragging: null, over: null });

    const handleDragStart = useCallback((colId: string) => {
      setDragState({ dragging: colId, over: null });
    }, []);
    const handleDragOver = useCallback((colId: string) => {
      setDragState((prev) => ({ ...prev, over: colId }));
    }, []);
    const handleDragEnd = useCallback(() => {
      setDragState((prev) => {
        if (prev.dragging && prev.over && prev.dragging !== prev.over && onSetColumns) {
          const newCols = [...effectiveColumns];
          const fromIdx = newCols.indexOf(prev.dragging);
          const toIdx = newCols.indexOf(prev.over);
          if (fromIdx !== -1 && toIdx !== -1) {
            newCols.splice(fromIdx, 1);
            newCols.splice(toIdx, 0, prev.dragging);
            onSetColumns(newCols);
          }
        }
        return { dragging: null, over: null };
      });
    }, [effectiveColumns, onSetColumns]);

    // ── Sorting ──
    const sortingState: SortingState = useMemo(
      () => sort.map(([id, dir]) => ({ id, desc: dir === 'desc' })),
      [sort]
    );
    const sortingStateRef = useRef(sortingState);
    sortingStateRef.current = sortingState;

    const onSortRef = useRef(onSort);
    onSortRef.current = onSort;

    const handleSortingChange = useCallback(
      (updater: SortingState | ((prev: SortingState) => SortingState)) => {
        if (!onSortRef.current) return;
        const next =
          typeof updater === 'function' ? updater(sortingStateRef.current) : updater;
        onSortRef.current(next.map(({ id, desc }) => [id, desc ? 'desc' : 'asc']));
      },
      []
    );

    // ── Column sizing ──
    const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(() => {
      const initial: ColumnSizingState = {};
      if (settings?.columns) {
        for (const [colId, colSettings] of Object.entries(settings.columns)) {
          if (colSettings.width) initial[colId] = colSettings.width;
        }
      }
      return initial;
    });

    useEffect(() => {
      if (!settings?.columns) return;
      const fromSettings: ColumnSizingState = {};
      for (const [colId, colSettings] of Object.entries(settings.columns)) {
        if (colSettings.width) fromSettings[colId] = colSettings.width;
      }
      setColumnSizing((prev) => ({ ...prev, ...fromSettings }));
    }, [settings?.columns]);

    const handleColumnSizingChange = useCallback(
      (updater: ColumnSizingState | ((prev: ColumnSizingState) => ColumnSizingState)) => {
        setColumnSizing((prev) => (typeof updater === 'function' ? updater(prev) : updater));
      },
      []
    );

    const resizingColumnsRef = useRef<Set<string>>(new Set());
    const onResizeRef = useRef(onResize);
    onResizeRef.current = onResize;

    // ── Expand doc ──
    const [localExpandedDoc, setLocalExpandedDoc] = useState<DataTableRecord | undefined>();
    const currentExpandedDoc = expandedDoc ?? localExpandedDoc;

    const expandedDocRef = useRef(currentExpandedDoc);
    expandedDocRef.current = currentExpandedDoc;

    const toggleExpandDoc = useCallback(
      (doc: DataTableRecord) => {
        const next = expandedDocRef.current?.id === doc.id ? undefined : doc;
        if (setExpandedDoc) {
          setExpandedDoc(next);
        } else {
          setLocalExpandedDoc(next);
        }
      },
      [setExpandedDoc]
    );
    const toggleExpandDocRef = useRef(toggleExpandDoc);
    toggleExpandDocRef.current = toggleExpandDoc;

    const onFilterRef = useRef(onFilter);
    onFilterRef.current = onFilter;

    const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

    // ── Column header context menu ──
    const [headerMenuState, setHeaderMenuState] = useState<{
      colId: string;
      anchorPosition: { top: number; left: number };
    } | null>(null);

    const handleHeaderContextMenu = useCallback(
      (e: React.MouseEvent, colId: string) => {
        e.preventDefault();
        setHeaderMenuState({ colId, anchorPosition: { top: e.clientY, left: e.clientX } });
      },
      []
    );

    const closeHeaderMenu = useCallback(() => setHeaderMenuState(null), []);

    const headerMenuItems = useMemo(() => {
      if (!headerMenuState) return [];
      const { colId } = headerMenuState;
      const colIndex = effectiveColumns.indexOf(colId);
      const items: Array<{ name: string; icon: string; onClick: () => void }> = [];

      if (colIndex > 0 && onSetColumns) {
        items.push({
          name: 'Move left',
          icon: 'sortLeft',
          onClick: () => {
            const newCols = [...effectiveColumns];
            [newCols[colIndex - 1], newCols[colIndex]] = [newCols[colIndex], newCols[colIndex - 1]];
            onSetColumns(newCols, false);
            closeHeaderMenu();
          },
        });
      }

      if (colIndex < effectiveColumns.length - 1 && colIndex >= 0 && onSetColumns) {
        items.push({
          name: 'Move right',
          icon: 'sortRight',
          onClick: () => {
            const newCols = [...effectiveColumns];
            [newCols[colIndex], newCols[colIndex + 1]] = [newCols[colIndex + 1], newCols[colIndex]];
            onSetColumns(newCols, false);
            closeHeaderMenu();
          },
        });
      }

      items.push({
        name: 'Copy column name',
        icon: 'copyClipboard',
        onClick: () => {
          navigator.clipboard.writeText(colId);
          closeHeaderMenu();
        },
      });

      items.push({
        name: 'Copy column values',
        icon: 'copyClipboard',
        onClick: () => {
          const values = rows.map((r) => formatCellValue(r.flattened[colId])).join('\n');
          navigator.clipboard.writeText(values);
          closeHeaderMenu();
        },
      });

      if (onResize) {
        items.push({
          name: 'Reset width',
          icon: 'empty',
          onClick: () => {
            onResize({ columnId: colId, width: undefined });
            closeHeaderMenu();
          },
        });
      }

      if (onSetColumns && colId !== dataView.timeFieldName) {
        items.push({
          name: 'Remove column',
          icon: 'cross',
          onClick: () => {
            onSetColumns(
              effectiveColumns.filter((c) => c !== colId),
              false
            );
            closeHeaderMenu();
          },
        });
      }

      return items;
    }, [headerMenuState, effectiveColumns, onSetColumns, onResize, rows, dataView.timeFieldName, closeHeaderMenu]);

    // ── Build TanStack column defs ──
    const tanstackColumns: ColumnDef<DataTableRecord>[] = useMemo(() => {
      const defs: ColumnDef<DataTableRecord>[] = [];

      if (!isGroupedMode) {
        // Select column
        defs.push({
          id: SELECT_COLUMN_ID,
          header: '',
          size: SELECT_COL_WIDTH,
          minSize: SELECT_COL_WIDTH,
          maxSize: SELECT_COL_WIDTH,
          enableResizing: false,
          enableSorting: false,
          meta: { isSelect: true },
          cell: function SelectCell({ row }) {
            const record = row.original;
            return (
              <EuiCheckbox
                id={`select-${record.id}`}
                checked={selectedRowsRef.current.has(record.id)}
                onChange={() => toggleSelectRowRef.current(record.id)}
                aria-label={`Select row ${row.index + 1}`}
                compressed
              />
            );
          },
        });

        // Expand column
        defs.push({
          id: EXPAND_COLUMN_ID,
          header: '',
          size: CONTROL_COL_WIDTH,
          minSize: CONTROL_COL_WIDTH,
          maxSize: CONTROL_COL_WIDTH,
          enableResizing: false,
          enableSorting: false,
          meta: { isControl: true },
          cell: function ExpandCell({ row }) {
            const record = row.original;
            const isExp = expandedDocRef.current?.id === record.id;
            return (
              <EuiButtonIcon
                size="xs"
                iconSize="s"
                aria-label="Toggle document details"
                data-test-subj="docTableExpandToggleColumn"
                onClick={() => toggleExpandDocRef.current(record)}
                onKeyDown={(e: React.KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpandDocRef.current(record);
                  }
                }}
                color={isExp ? 'primary' : 'text'}
                iconType={isExp ? 'minimize' : 'expand'}
                isSelected={isExp}
              />
            );
          },
        });
      }

      if (isSummaryMode) {
        if (showTimeCol && timeFieldName) {
          defs.push({
            id: timeFieldName,
            accessorFn: (r) => r.flattened[timeFieldName],
            header: timeFieldName,
            size: settings?.columns?.[timeFieldName]?.width ?? 210,
            minSize: MIN_COL_WIDTH,
            enableSorting: false,
            meta: { isTimestamp: true, fieldName: timeFieldName },
            cell: ({ getValue }) => (
              <span css={styles.timestampCell}>{formatTimestamp(getValue())}</span>
            ),
          });
        }

        defs.push({
          id: SOURCE_COLUMN_ID,
          header: 'Summary',
          size: 99999,
          enableResizing: false,
          enableSorting: false,
          meta: { isSummary: true },
          cell: ({ row }) => (
            <SummaryCellContent
              row={row.original}
              dataView={dataView}
              shouldShowFieldHandler={shouldShowFieldHandler}
              fieldFormats={fieldFormats}
              columnsMeta={columnsMeta}
            />
          ),
        });
      } else {
        for (const colId of effectiveColumns) {
          if (colId === SOURCE_COLUMN_ID) continue;
          const isTimeField = colId === timeFieldName;

          defs.push({
            id: colId,
            accessorFn: (r) => r.flattened[colId],
            header: settings?.columns?.[colId]?.display ?? colId,
            size: settings?.columns?.[colId]?.width ?? DEFAULT_COL_WIDTH,
            minSize: MIN_COL_WIDTH,
            enableSorting: isSortEnabled,
            meta: { isTimestamp: isTimeField, fieldName: colId },
            cell: function DataCell({ getValue, row }) {
              const val = getValue();
              let formatted: string;
              if (isTimeField) {
                formatted = formatTimestamp(val);
              } else {
                const dvField = dataView.getFieldByName(colId);
                if (dvField && fieldFormats) {
                  formatted = formatFieldValue(val, row.original.raw, fieldFormats, dataView, dvField, 'text');
                } else {
                  formatted = formatCellValue(val);
                }
              }
              return (
                <div css={isTimeField ? styles.timestampCell : undefined} title={formatted}>
                  {formatted}
                </div>
              );
            },
          });
        }
      }

      return defs;
    }, [
      columnsMeta,
      dataView,
      effectiveColumns,
      fieldFormats,
      isGroupedMode,
      isSortEnabled,
      isSummaryMode,
      settings,
      shouldShowFieldHandler,
      showTimeCol,
      styles,
      timeFieldName,
    ]);

    // ── React Table instance ──
    const table = useReactTable({
      data: rows,
      columns: tanstackColumns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel:
        isSortEnabled && !isSummaryMode && !isGroupedMode ? getSortedRowModel() : undefined,
      state: { sorting: sortingState, columnSizing },
      onSortingChange: handleSortingChange,
      onColumnSizingChange: handleColumnSizingChange,
      columnResizeMode: 'onChange',
      enableColumnResizing: !isGroupedMode,
      enableSorting: isSortEnabled && !isSummaryMode && !isGroupedMode,
      enableMultiSort: true,
      manualSorting: false,
    });

    // Persist column width when resize ends
    const headerGroupsRaw = table.getHeaderGroups();
    useEffect(() => {
      const resizeRef = onResizeRef.current;
      if (!resizeRef) return;
      for (const hg of headerGroupsRaw) {
        for (const header of hg.headers) {
          const colId = header.column.id;
          if (colId === EXPAND_COLUMN_ID || colId === SELECT_COLUMN_ID) continue;
          if (header.column.getIsResizing()) {
            resizingColumnsRef.current.add(colId);
          } else if (resizingColumnsRef.current.has(colId)) {
            resizingColumnsRef.current.delete(colId);
            resizeRef({ columnId: colId, width: header.column.getSize() });
          }
        }
      }
    });

    const tableRows = table.getRowModel().rows;
    const bodyRowHeight = useMemo(() => {
      if (bodyMaxLines <= 1 || bodyMaxLines === 0) return densityCfg.rowHeight;
      const lineH = densityCfg.fontSize * 1.5;
      return Math.round(densityCfg.cellPaddingV * 2 + lineH * bodyMaxLines);
    }, [bodyMaxLines, densityCfg]);
    const baseRowHeight = isSummaryMode ? densityCfg.summaryRowHeight : bodyRowHeight;
    const totalColCount = table.getVisibleLeafColumns().length;

    const getRowHeight = useCallback(
      (index: number): number => {
        if (!isGroupedMode) return baseRowHeight;
        const row = tableRows[index];
        if (!row) return baseRowHeight;
        if (groupExpandedSet.has(row.id)) {
          const subRowCount = 2 + (index % (MAX_GROUP_SUB_ROWS - 1));
          return densityCfg.rowHeight + GROUP_SUB_PANEL_HEADER + subRowCount * GROUP_SUB_ROW_HEIGHT + 2;
        }
        return densityCfg.rowHeight;
      },
      [isGroupedMode, baseRowHeight, densityCfg.rowHeight, tableRows, groupExpandedSet]
    );

    // ── Virtualizer ──
    const rowVirtualizer = useVirtualizer({
      count: tableRows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: getRowHeight,
      overscan: OVERSCAN,
      initialOffset: scrollPositionCache.get(scrollKey) ?? 0,
    });

    useEffect(() => {
      rowVirtualizer.measure();
    }, [groupExpandedSet, density, bodyMaxLines, rowVirtualizer]);

    useEffect(() => {
      const scrollEl = parentRef.current;
      if (!scrollEl) return;
      let rafId: number;
      const handleScroll = () => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          scrollPositionCache.set(scrollKey, scrollEl.scrollTop);
        });
      };
      scrollEl.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        cancelAnimationFrame(rafId);
        scrollEl.removeEventListener('scroll', handleScroll);
      };
    }, [scrollKey]);

    // ── Ctrl+F to open find bar ──
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const handler = (e: Event) => {
        const ke = e as KeyboardEvent;
        if ((ke.metaKey || ke.ctrlKey) && ke.key === 'f') {
          ke.preventDefault();
          setIsFindOpen(true);
        }
      };
      wrapper.addEventListener('keydown', handler);
      return () => wrapper.removeEventListener('keydown', handler);
    }, []);

    // Scroll to active find match
    useEffect(() => {
      if (findActiveMatch) {
        rowVirtualizer.scrollToIndex(findActiveMatch.rowIndex, { align: 'center' });
      }
    }, [findActiveMatch, rowVirtualizer]);

    // ── Keyboard navigation ──
    const handleGridKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        const current = focusedCellRef.current;
        if (!current) {
          if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            setFocusedCell({ row: 0, col: 0 });
            e.preventDefault();
          }
          return;
        }

        let { row: r, col: c } = current;

        switch (e.key) {
          case 'ArrowDown':
            r = Math.min(r + 1, tableRows.length - 1);
            e.preventDefault();
            break;
          case 'ArrowUp':
            r = Math.max(r - 1, 0);
            e.preventDefault();
            break;
          case 'ArrowRight':
            c = Math.min(c + 1, totalColCount - 1);
            e.preventDefault();
            break;
          case 'ArrowLeft':
            c = Math.max(c - 1, 0);
            e.preventDefault();
            break;
          case 'Home':
            c = 0;
            if (e.ctrlKey) r = 0;
            e.preventDefault();
            break;
          case 'End':
            c = totalColCount - 1;
            if (e.ctrlKey) r = tableRows.length - 1;
            e.preventDefault();
            break;
          case 'PageDown':
            r = Math.min(r + 20, tableRows.length - 1);
            e.preventDefault();
            break;
          case 'PageUp':
            r = Math.max(r - 20, 0);
            e.preventDefault();
            break;
          case 'Escape':
            setFocusedCell(null);
            e.preventDefault();
            return;
          default:
            return;
        }

        setFocusedCell({ row: r, col: c });
        rowVirtualizer.scrollToIndex(r, { align: 'auto' });
      },
      [tableRows.length, totalColCount, rowVirtualizer]
    );

    const virtualItems = rowVirtualizer.getVirtualItems();
    const canRenderDocumentView = Boolean(setExpandedDoc && renderDocumentView);
    const isLoading = loadingState === DataLoadingState.loading;
    const isEmpty = !isLoading && rows.length === 0;
    const totalWidth = table.getTotalSize();

    const densityVars = useMemo(
      () =>
        ({
          '--tsg-font-size': `${densityCfg.fontSize}px`,
          '--tsg-cell-padding-v': `${densityCfg.cellPaddingV}px`,
          '--tsg-cell-padding-h': `${densityCfg.cellPaddingH}px`,
          '--tsg-header-max-lines': String(headerMaxLines),
          '--tsg-body-max-lines': bodyMaxLines === 0 ? 'none' : String(bodyMaxLines),
        } as React.CSSProperties),
      [densityCfg, headerMaxLines, bodyMaxLines]
    );

    // ── Copy selected rows ──
    const copySelectedAsText = useCallback(() => {
      const selectedRecords = rows.filter((r) => selectedRows.has(r.id));
      const cols = effectiveColumns.filter((c) => c !== SOURCE_COLUMN_ID);
      const header = cols.join('\t');
      const body = selectedRecords
        .map((r) => cols.map((c) => formatCellValue(r.flattened[c])).join('\t'))
        .join('\n');
      navigator.clipboard.writeText(`${header}\n${body}`);
    }, [rows, selectedRows, effectiveColumns]);

    const copySelectedAsJson = useCallback(() => {
      const selectedRecords = rows.filter((r) => selectedRows.has(r.id));
      const json = JSON.stringify(selectedRecords.map((r) => r.flattened), null, 2);
      navigator.clipboard.writeText(json);
    }, [rows, selectedRows]);

    const copySelectedAsMarkdown = useCallback(() => {
      const selectedRecords = rows.filter((r) => selectedRows.has(r.id));
      const cols = effectiveColumns.filter((c) => c !== SOURCE_COLUMN_ID);
      const header = `| ${cols.join(' | ')} |`;
      const sep = `| ${cols.map(() => '---').join(' | ')} |`;
      const body = selectedRecords
        .map((r) => `| ${cols.map((c) => formatCellValue(r.flattened[c])).join(' | ')} |`)
        .join('\n');
      navigator.clipboard.writeText(`${header}\n${sep}\n${body}`);
    }, [rows, selectedRows, effectiveColumns]);

    const isLoadingMore = loadingState === DataLoadingState.loadingMore;

    return (
      <div ref={wrapperRef} css={[styles.wrapper, isFullScreen && styles.fullScreen]} style={densityVars} data-test-subj="tanstackGridWrapper">
        {/* Find in table bar */}
        {isFindOpen && (
          <FindInTableBar
            matchesCount={findMatches.length}
            activeIndex={findActiveIndex}
            onSearch={handleFindSearch}
            onNext={handleFindNext}
            onPrev={handleFindPrev}
            onClose={handleFindClose}
            styles={styles}
          />
        )}
        {/* Toolbar */}
        <div css={styles.toolbar}>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiBadge color="accent">TanStack Grid</EuiBadge>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs">
                {rows.length.toLocaleString()} rows
                {isSummaryMode ? ' · Summary' : ` · ${effectiveColumns.length} columns`}
                {isGroupedMode ? ' · Grouped' : ''}
              </EuiText>
            </EuiFlexItem>
            {isGroupedMode && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="primary">
                  Grouped by: {statsByInfo!.byFields.join(', ')}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {externalAdditionalControls && (
              <EuiFlexItem grow={false}>{externalAdditionalControls}</EuiFlexItem>
            )}
          </EuiFlexGroup>
          <div css={styles.toolbarRight}>
            {focusedCell && (
              <EuiBadge color="hollow">
                R{focusedCell.row + 1}:C{focusedCell.col + 1}
              </EuiBadge>
            )}
            <EuiToolTip content="Find in table">
              <EuiButtonIcon
                iconType="search"
                aria-label="Find in table"
                size="xs"
                onClick={() => setIsFindOpen((v) => !v)}
                data-test-subj="dataGridFindInTableButton"
              />
            </EuiToolTip>
            <EuiPopover
              button={
                <EuiToolTip content="Grid density">
                  <EuiButtonIcon
                    iconType={densityCfg.icon}
                    aria-label="Grid density"
                    size="xs"
                    onClick={() => setIsDensityPopoverOpen((v) => !v)}
                    data-test-subj="dataGridDensityButton"
                  />
                </EuiToolTip>
              }
              isOpen={isDensityPopoverOpen}
              closePopover={() => setIsDensityPopoverOpen(false)}
              anchorPosition="downRight"
              panelPaddingSize="s"
            >
              <EuiText size="xs" css={{ marginBottom: 6, fontWeight: 600 }}>
                Density
              </EuiText>
              <EuiButtonGroup
                legend="Grid density"
                options={DENSITY_BUTTONS}
                idSelected={density}
                onChange={(id) => {
                  setDensity(id as GridDensity);
                }}
                buttonSize="compressed"
                isFullWidth
                data-test-subj="dataGridDensityButtonGroup"
              />
              <EuiSpacer size="s" />
              <EuiFormRow
                label="Max header cell lines"
                display="columnCompressed"
                fullWidth
              >
                <EuiFieldNumber
                  compressed
                  min={1}
                  max={5}
                  step={1}
                  value={headerMaxLines}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= 1 && val <= 5) setHeaderMaxLines(val);
                  }}
                  data-test-subj="headerMaxLinesInput"
                />
              </EuiFormRow>
              <EuiFormRow
                label="Body cell lines"
                display="columnCompressed"
                fullWidth
              >
                <EuiFieldNumber
                  compressed
                  min={1}
                  max={20}
                  step={1}
                  value={bodyMaxLines}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= 1 && val <= 20) setBodyMaxLines(val);
                  }}
                  data-test-subj="bodyMaxLinesInput"
                />
              </EuiFormRow>
            </EuiPopover>
            <EuiToolTip content={isFullScreen ? 'Exit full screen' : 'Full screen'}>
              <EuiButtonIcon
                iconType={isFullScreen ? 'fullScreenExit' : 'fullScreen'}
                aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
                size="xs"
                onClick={toggleFullScreen}
                data-test-subj="dataGridFullScreenButton"
              />
            </EuiToolTip>
          </div>
        </div>

        {/* Selection bar */}
        {selectedRows.size > 0 && (
          <div css={styles.selectionBar} data-test-subj="selectionBar">
            <EuiText size="xs">
              <strong>{selectedRows.size}</strong> row{selectedRows.size !== 1 ? 's' : ''} selected
            </EuiText>
            <EuiButtonEmpty size="xs" onClick={copySelectedAsText} iconType="copyClipboard">
              Copy as TSV
            </EuiButtonEmpty>
            <EuiButtonEmpty size="xs" onClick={copySelectedAsJson} iconType="copyClipboard">
              Copy as JSON
            </EuiButtonEmpty>
            <EuiButtonEmpty size="xs" onClick={copySelectedAsMarkdown} iconType="copyClipboard">
              Copy as Markdown
            </EuiButtonEmpty>
            <EuiButtonEmpty size="xs" onClick={clearSelection} iconType="cross" color="text">
              Clear
            </EuiButtonEmpty>
          </div>
        )}

        <div css={styles.contentArea}>
          {isEmpty ? (
            <EuiEmptyPrompt
              css={styles.emptyState}
              iconType="discoverApp"
              title={<h3>No results found</h3>}
              body="Try adjusting your query or time range."
              data-test-subj="discoverNoResults"
            />
          ) : (
            <div
              ref={parentRef}
              css={styles.scrollContainer}
              role="grid"
              aria-rowcount={tableRows.length + 1}
              aria-colcount={totalColCount}
              tabIndex={0}
              onKeyDown={!isGroupedMode ? handleGridKeyDown : undefined}
            >
              {/* Header */}
              {!isGroupedMode &&
                headerGroupsRaw.map((headerGroup) => (
                  <div
                    key={headerGroup.id}
                    css={styles.headerRow}
                    role="row"
                    aria-rowindex={1}
                    style={{ width: totalWidth }}
                  >
                    {headerGroup.headers.map((header) => {
                      const isControl = header.column.columnDef.meta?.isControl;
                      const isSelect = header.column.columnDef.meta?.isSelect;
                      const isSummary = header.column.columnDef.meta?.isSummary;
                      const canSort = header.column.getCanSort();
                      const sortDir = header.column.getIsSorted();
                      const colId = header.column.id;
                      const isDraggable =
                        !isControl && !isSelect && !isSummary && Boolean(onSetColumns);
                      const isDragging = dragState.dragging === colId;
                      const isDragOver = dragState.over === colId && dragState.dragging !== colId;

                      if (isSelect) {
                        return (
                          <div
                            key={header.id}
                            css={styles.selectHeaderCell}
                            style={{ width: header.getSize() }}
                            role="columnheader"
                          >
                            <EuiCheckbox
                              id="select-all"
                              checked={allSelected}
                              indeterminate={someSelected}
                              onChange={toggleSelectAll}
                              aria-label="Select all rows"
                              compressed
                            />
                          </div>
                        );
                      }

                      return (
                        <div
                          key={header.id}
                          css={[
                            isControl ? styles.controlHeaderCell : styles.headerCell,
                            canSort && styles.headerCellSortable,
                            isDraggable && styles.headerCellDraggable,
                            isDragging && styles.headerCellDragging,
                            isDragOver && styles.headerCellDragOver,
                          ]}
                          style={{
                            width: isSummary ? undefined : header.getSize(),
                            flex: isSummary ? '1 1 0' : undefined,
                          }}
                          role="columnheader"
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          draggable={isDraggable}
                          onDragStart={
                            isDraggable
                              ? () => handleDragStart(colId)
                              : undefined
                          }
                          onDragOver={
                            isDraggable
                              ? (e) => {
                                  e.preventDefault();
                                  handleDragOver(colId);
                                }
                              : undefined
                          }
                          onDrop={isDraggable ? handleDragEnd : undefined}
                          onDragEnd={handleDragEnd}
                          onContextMenu={
                            !isControl && !isSelect && !isSummary
                              ? (e: React.MouseEvent) => handleHeaderContextMenu(e, colId)
                              : undefined
                          }
                        >
                          {!isControl && (
                            <>
                              {showColumnTokens && !isSummary && (() => {
                                const fieldName = header.column.columnDef.meta?.fieldName;
                                if (!fieldName) return null;
                                if (columnsMeta) {
                                  const iconType = getTextBasedColumnIconType(columnsMeta[fieldName]);
                                  if (iconType && iconType !== 'unknown') {
                                    return <FieldIcon type={iconType} css={{ marginRight: 4, flexShrink: 0 }} />;
                                  }
                                } else {
                                  const dvField = dataView.getFieldByName(fieldName);
                                  if (dvField) {
                                    return <FieldIcon {...getFieldIconProps(dvField)} css={{ marginRight: 4, flexShrink: 0 }} />;
                                  }
                                }
                                return null;
                              })()}
                              <span css={styles.headerCellText}>
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                              </span>
                              {sortDir && (
                                <span css={styles.sortIndicator}>
                                  <EuiIcon
                                    type={sortDir === 'asc' ? 'sortUp' : 'sortDown'}
                                    size="s"
                                  />
                                </span>
                              )}
                            </>
                          )}
                          {header.column.getCanResize() && !isControl && !isSummary && (
                            <div
                              css={[
                                styles.resizeHandle,
                                header.column.getIsResizing() && styles.resizeHandleActive,
                              ]}
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              onClick={stopPropagation}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}

              {/* Grouped mode header */}
              {isGroupedMode && (
                <div css={styles.headerRow} role="row" style={{ width: totalWidth }}>
                  <div
                    css={styles.controlHeaderCell}
                    style={{ width: CONTROL_COL_WIDTH }}
                    role="columnheader"
                  />
                  <div css={styles.headerCell} style={{ flex: '1 1 0' }} role="columnheader">
                    <span css={styles.headerCellText}>
                      Groups ({statsByInfo!.byFields.join(', ')})
                    </span>
                  </div>
                </div>
              )}

              {/* Virtual body */}
              <div
                css={styles.virtualOuter}
                style={{ height: rowVirtualizer.getTotalSize() }}
              >
                <div
                  css={styles.virtualInner}
                  style={{
                    transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
                    width: totalWidth,
                  }}
                >
                  {virtualItems.map((virtualRow) => {
                    const row = tableRows[virtualRow.index];
                    const record = row.original;

                    if (isGroupedMode) {
                      return (
                      <GroupedVirtualRow
                        key={row.id}
                        row={row}
                        virtualRow={virtualRow}
                        isGroupExpanded={groupExpandedSet.has(row.id)}
                        onToggleGroup={toggleGroupExpand}
                        byFields={statsByInfo!.byFields}
                        aggregateColumns={aggregateColumns}
                        styles={styles}
                        totalWidth={totalWidth}
                        groupRowHeight={densityCfg.rowHeight}
                      />
                      );
                    }

                    const isExpanded = currentExpandedDoc?.id === record.id;
                    const isSelected = selectedRows.has(record.id);
                    const indicator = getRowIndicator?.(record);

                    return (
                      <VirtualRow
                        key={row.id}
                        row={row}
                        virtualRow={virtualRow}
                        isExpanded={isExpanded}
                        isSelected={isSelected}
                        indicatorColor={indicator?.color}
                        rowHeight={baseRowHeight}
                        styles={styles}
                        focusedColIndex={
                          focusedCell?.row === virtualRow.index ? focusedCell.col : null
                        }
                        rowIndex={virtualRow.index}
                        onFilter={onFilterRef.current}
                        setPopoverState={setPopoverState}
                        findTerm={findTerm}
                        findActiveMatch={findActiveMatch}
                      />
                    );
                  })}
                </div>
              </div>

              {isLoading && (
                <div css={styles.loadingOverlay}>
                  <EuiLoadingSpinner size="xl" />
                </div>
              )}
              {isLoadingMore && (
                <EuiProgress size="xs" color="accent" position="absolute" css={{ bottom: 0, left: 0, right: 0, top: 'auto' }} />
              )}
            </div>
          )}

          {!isGroupedMode && canRenderDocumentView && currentExpandedDoc && (
            <span className="dscTable__flyout">
              {renderDocumentView!(
                currentExpandedDoc,
                rows,
                columns,
                setExpandedDoc!,
                columnsMeta
              )}
            </span>
          )}
        </div>

        {/* Cell popover */}
        {popoverState && (
          <CellPopover
            fieldName={popoverState.fieldName}
            value={popoverState.value}
            anchorRect={popoverState.rect}
            onClose={closePopover}
            onFilter={onFilterRef.current}
            styles={styles}
          />
        )}

        {/* Column header context menu */}
        {headerMenuState && (
          <>
            <div
              css={{ position: 'fixed', inset: 0, zIndex: 9998 }}
              onClick={closeHeaderMenu}
            />
            <div
              css={{
                position: 'fixed',
                top: headerMenuState.anchorPosition.top,
                left: headerMenuState.anchorPosition.left,
                zIndex: 9999,
                backgroundColor: euiTheme.colors.backgroundBasePlain,
                borderRadius: euiTheme.border.radius.medium,
                boxShadow: euiTheme.levels.menu === 1000 ? '0 1px 5px rgba(0,0,0,.1), 0 3px 15px rgba(0,0,0,.1)' : undefined,
                border: euiTheme.border.thin,
                padding: `${euiTheme.size.xs} 0`,
                minWidth: 200,
              }}
              data-test-subj="columnHeaderMenu"
            >
              {headerMenuItems.map((item) => (
                <button
                  key={item.name}
                  css={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: euiTheme.size.s,
                    width: '100%',
                    padding: `${euiTheme.size.xs} ${euiTheme.size.m}`,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: euiTheme.size.m,
                    textAlign: 'left',
                    '&:hover': {
                      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
                    },
                  }}
                  onClick={item.onClick}
                >
                  <EuiIcon type={item.icon} size="s" />
                  {item.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }
);

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
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDataGridToolbarControl,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiNotificationBadge,
  EuiPopover,
  EuiPopoverTitle,
  EuiProgress,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  euiFontSize,
  keys,
  logicalStyle,
  mathWithUnits,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord, DataTableColumnsMeta, RowControlProps } from '@kbn/discover-utils';
import {
  getShouldShowFieldHandler,
  calcFieldCounts,
  formatFieldValueText,
  canPrependTimeFieldColumn,
  getVisibleColumns,
  prepareDataViewForEditing,
} from '@kbn/discover-utils';
import { FieldIcon, getFieldIconProps, getTextBasedColumnIconType } from '@kbn/field-utils';
import { i18n } from '@kbn/i18n';
import {
  SourceDocument,
  DataLoadingState,
  getDisplayedColumns,
  ROWS_HEIGHT_OPTIONS,
  DataGridDensity,
  DATA_GRID_DENSITY_STYLE_MAP,
  getDataGridDensityPadding,
  useDataGridDensity,
  useRowHeight,
  RowHeightType,
  SOURCE_COLUMN,
  UnifiedDataTableSourceColumnHeader,
  UnifiedDataTableAdditionalDisplaySettings,
  convertValueToString,
  getColumnDisplayName,
  getSchemaByKbnType,
  isSortable,
  CompareDocuments,
  CopyAsTextFormat,
  copyRowsAsJsonToClipboard,
  copyRowsAsTextToClipboard,
  getSchemaDetectors,
  type UnifiedDataTableProps,
  type SortOrder,
  type RenderDocumentViewMeta,
  type ValueToStringConverter,
  type DocMap,
} from '@kbn/unified-data-table';
import { uniq } from 'lodash';
import type { AggregateQuery } from '@kbn/es-query';
import { getDataViewFieldOrCreateFromColumnMeta } from '@kbn/data-view-utils';
import {
  getTanStackDataGridStyles,
  CONTROL_COL_WIDTH,
  SELECT_COL_WIDTH,
  DEFAULT_COL_WIDTH,
  MIN_COL_WIDTH,
} from './tanstack_data_grid.styles';
import {
  computeTanStackColumnLayout,
  getTimeColumnWidth,
  type TanStackDataColumnDescriptor,
  type TanStackColumnLayout,
} from './tanstack_column_layout';
import { TanStackColumnHeaderActions } from './tanstack_column_header_actions';
import type { useDiscoverServices } from '../../../hooks/use_discover_services';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    isControl?: boolean;
    isSelect?: boolean;
    isSummary?: boolean;
    isTimestamp?: boolean;
    fieldName?: string;
    formatValue?: (value: unknown) => string;
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
  setRenderDocumentViewMeta?: UnifiedDataTableProps['setRenderDocumentViewMeta'];

  loadingState?: DataLoadingState;
  onFilter?: UnifiedDataTableProps['onFilter'];
  getRowIndicator?: UnifiedDataTableProps['getRowIndicator'];
  rowAdditionalLeadingControls?: UnifiedDataTableProps['rowAdditionalLeadingControls'];

  dataGridDensityState?: UnifiedDataTableProps['dataGridDensityState'];
  onUpdateDataGridDensity?: UnifiedDataTableProps['onUpdateDataGridDensity'];
  rowHeightState?: UnifiedDataTableProps['rowHeightState'];
  onUpdateRowHeight?: UnifiedDataTableProps['onUpdateRowHeight'];
  configRowHeight?: UnifiedDataTableProps['configRowHeight'];
  headerRowHeightState?: UnifiedDataTableProps['headerRowHeightState'];
  onUpdateHeaderRowHeight?: UnifiedDataTableProps['onUpdateHeaderRowHeight'];
  configHeaderRowHeight?: UnifiedDataTableProps['configHeaderRowHeight'];
  maxAllowedSampleSize?: UnifiedDataTableProps['maxAllowedSampleSize'];
  sampleSizeState?: UnifiedDataTableProps['sampleSizeState'];
  onUpdateSampleSize?: UnifiedDataTableProps['onUpdateSampleSize'];
  onFullScreenChange?: UnifiedDataTableProps['onFullScreenChange'];
  services: UnifiedDataTableProps['services'];
  onFieldEdited?: UnifiedDataTableProps['onFieldEdited'];
  shouldKeepAdHocDataViewImmutable?: UnifiedDataTableProps['shouldKeepAdHocDataViewImmutable'];
  consumer?: UnifiedDataTableProps['consumer'];
  externalAdditionalControls?: React.ReactNode;
  gridImplementationSwitch?: React.ReactNode;
  toolbarLeftSide?: React.ReactNode;
  toolbarTrailingControl?: React.ReactNode;
  showKeyboardShortcuts?: UnifiedDataTableProps['showKeyboardShortcuts'];
  showSummaryColumnToggle?: UnifiedDataTableProps['showSummaryColumnToggle'];
  enableComparisonMode?: UnifiedDataTableProps['enableComparisonMode'];
  ariaLabelledBy?: UnifiedDataTableProps['ariaLabelledBy'];
  showFullScreenButton?: UnifiedDataTableProps['showFullScreenButton'];
}

const DENSITY_ICONS: Record<DataGridDensity, string> = {
  [DataGridDensity.COMPACT]: 'menuLeft',
  [DataGridDensity.NORMAL]: 'menu',
  [DataGridDensity.EXPANDED]: 'menuRight',
};

const DENSITY_BUTTONS = [
  {
    id: DataGridDensity.COMPACT,
    label: i18n.translate('discover.grid.tanStack.compactDensityButtonLabel', {
      defaultMessage: 'Compact',
    }),
    iconType: 'menuLeft',
  },
  {
    id: DataGridDensity.NORMAL,
    label: i18n.translate('discover.grid.tanStack.normalDensityButtonLabel', {
      defaultMessage: 'Normal',
    }),
    iconType: 'menu',
  },
  {
    id: DataGridDensity.EXPANDED,
    label: i18n.translate('discover.grid.tanStack.expandedDensityButtonLabel', {
      defaultMessage: 'Expanded',
    }),
    iconType: 'menuRight',
  },
];

const OVERSCAN = 20;
const MAX_SUMMARY_FIELDS = 80;
const MAX_SELECTED_DOCS_FOR_COMPARE = 100;

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
        if (
          val !== null &&
          val !== undefined &&
          formatCellValue(val).toLowerCase().includes(lower)
        ) {
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

    const handleBlur = useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        if (!inputValue && !event.currentTarget.contains(event.relatedTarget)) {
          onClose();
        }
      },
      [inputValue, onClose]
    );

    const hasResults = matchesCount > 0;
    const counter = `${inputValue && hasResults ? activeIndex + 1 : 0}/${matchesCount}`;

    return (
      <EuiFieldSearch
        inputRef={(node) => {
          (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
        }}
        compressed
        css={styles.findInput}
        placeholder={i18n.translate('discover.grid.tanStack.findInTablePlaceholder', {
          defaultMessage: 'Find in table',
        })}
        value={inputValue}
        onChange={handleChange}
        onKeyUp={handleKeyUp}
        onBlur={handleBlur}
        data-test-subj="inTableSearchInput"
        isClearable
        aria-label={i18n.translate('discover.grid.tanStack.findInTableInputAriaLabel', {
          defaultMessage: 'Find in table',
        })}
        append={
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiText size="s" color="subdued" data-test-subj="inTableSearchMatchesCounter">
                {counter}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('discover.grid.tanStack.previousMatchButtonLabel', {
                  defaultMessage: 'Previous',
                })}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType="chevronSingleUp"
                  color="text"
                  disabled={!hasResults}
                  aria-label={i18n.translate('discover.grid.tanStack.previousMatchButtonLabel', {
                    defaultMessage: 'Previous',
                  })}
                  onClick={onPrev}
                  data-test-subj="inTableSearchButtonPrev"
                />
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('discover.grid.tanStack.nextMatchButtonLabel', {
                  defaultMessage: 'Next',
                })}
                disableScreenReaderOutput
              >
                <EuiButtonIcon
                  iconType="chevronSingleDown"
                  color="text"
                  disabled={!hasResults}
                  aria-label={i18n.translate('discover.grid.tanStack.nextMatchButtonLabel', {
                    defaultMessage: 'Next',
                  })}
                  onClick={onNext}
                  data-test-subj="inTableSearchButtonNext"
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
    );
  }
);

const EXPAND_COLUMN_ID = '__expand';
const SELECT_COLUMN_ID = '__select';
const SOURCE_COLUMN_ID = SOURCE_COLUMN;

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

// ── Cell Actions: filter in/out, copy, expand ──
const CellActions = React.memo(
  ({
    fieldName,
    value,
    formattedValue,
    onFilter,
    onExpand,
    styles,
  }: {
    fieldName: string;
    value: unknown;
    formattedValue: string;
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
        navigator.clipboard.writeText(formattedValue);
      },
      [formattedValue]
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
            <EuiToolTip content="Filter for value" disableScreenReaderOutput>
              <EuiButtonIcon
                css={styles.cellActionButton}
                iconType="plusCircle"
                aria-label="Filter for value"
                size="xs"
                iconSize="s"
                color="text"
                onClick={handleFilterIn}
                data-test-subj="filterForValue"
              />
            </EuiToolTip>
            <EuiToolTip content="Filter out value" disableScreenReaderOutput>
              <EuiButtonIcon
                css={styles.cellActionButton}
                iconType="minusCircle"
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
        <EuiToolTip content="Copy value" disableScreenReaderOutput>
          <EuiButtonIcon
            css={styles.cellActionButton}
            iconType="copy"
            aria-label="Copy value"
            size="xs"
            iconSize="s"
            color="text"
            onClick={handleCopy}
            data-test-subj="copyCellValue"
          />
        </EuiToolTip>
        <EuiToolTip content="Expand cell" disableScreenReaderOutput>
          <EuiButtonIcon
            css={styles.cellActionButton}
            iconType="maximize"
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
    formattedValue,
    anchorRect,
    onClose,
    onFilter,
    styles,
  }: {
    fieldName: string;
    value: unknown;
    formattedValue: string;
    anchorRect: DOMRect;
    onClose: () => void;
    onFilter?: UnifiedDataTableProps['onFilter'];
    styles: ReturnType<typeof getTanStackDataGridStyles>;
  }) => {
    const top = Math.max(8, Math.min(anchorRect.top, window.innerHeight - 240));
    const panelWidth = Math.min(window.innerWidth * 0.75, Math.max(anchorRect.width, 400));
    const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - panelWidth - 8));

    useEffect(() => {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleCopy = useCallback(() => {
      navigator.clipboard.writeText(formattedValue);
    }, [formattedValue]);

    return (
      <>
        <div
          css={styles.cellPopoverBackdrop}
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === keys.ENTER || e.key === keys.SPACE || e.key === keys.ESCAPE) {
              e.preventDefault();
              onClose();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Close"
        />
        <div
          css={styles.cellPopover}
          style={{ top, left, width: panelWidth }}
          data-test-subj="euiDataGridExpansionPopover"
          role="dialog"
          aria-label={`${fieldName} value`}
        >
          <div css={styles.cellPopoverHeader}>
            <EuiText size="s" css={styles.cellPopoverValue}>
              {formattedValue}
            </EuiText>
            <EuiToolTip content="Close" disableScreenReaderOutput>
              <EuiButtonIcon iconType="cross" aria-label="Close" size="xs" onClick={onClose} />
            </EuiToolTip>
          </div>
          <EuiHorizontalRule margin="none" />
          <div css={styles.cellPopoverActions}>
            {onFilter && (
              <>
                <EuiButtonEmpty
                  iconType="plusCircle"
                  size="s"
                  onClick={() => {
                    onFilter(fieldName, value, '+');
                    onClose();
                  }}
                >
                  {i18n.translate('discover.grid.tanStack.filterForValueButtonLabel', {
                    defaultMessage: 'Filter for',
                  })}
                </EuiButtonEmpty>
                <EuiButtonEmpty
                  iconType="minusCircle"
                  size="s"
                  onClick={() => {
                    onFilter(fieldName, value, '-');
                    onClose();
                  }}
                >
                  {i18n.translate('discover.grid.tanStack.filterOutValueButtonLabel', {
                    defaultMessage: 'Filter out',
                  })}
                </EuiButtonEmpty>
              </>
            )}
            <EuiButtonEmpty iconType="copy" size="s" onClick={handleCopy}>
              {i18n.translate('discover.grid.tanStack.copyValueButtonLabel', {
                defaultMessage: 'Copy value',
              })}
            </EuiButtonEmpty>
          </div>
        </div>
      </>
    );
  }
);

// ── Memoized virtual row ──
const VirtualRow = React.memo(
  React.forwardRef<
    HTMLDivElement,
    {
      row: Row<DataTableRecord>;
      virtualRow: VirtualItem;
      isExpanded: boolean;
      isSelected: boolean;
      indicatorColor: string | undefined;
      rowHeight: number;
      isAutoHeight: boolean;
      styles: ReturnType<typeof getTanStackDataGridStyles>;
      focusedColIndex: number | null;
      rowIndex: number;
      onFilter?: UnifiedDataTableProps['onFilter'];
      setPopoverState?: (
        state: { fieldName: string; value: unknown; formattedValue: string; rect: DOMRect } | null
      ) => void;
      findTerm?: string;
      findActiveMatch?: FindMatch | null;
      getColumnStyle: TanStackColumnLayout['getColumnStyle'];
    }
  >(function VirtualRow(
    {
      row,
      virtualRow,
      isExpanded,
      isSelected,
      indicatorColor,
      rowHeight,
      isAutoHeight,
      styles,
      focusedColIndex,
      rowIndex,
      onFilter,
      setPopoverState,
      findTerm,
      findActiveMatch,
      getColumnStyle,
    },
    ref
  ) {
    const cells = row.getVisibleCells();
    return (
      <div
        ref={ref}
        data-index={virtualRow.index}
        style={{ height: isAutoHeight ? undefined : rowHeight, width: '100%' }}
        role="row"
        aria-rowindex={rowIndex + 2}
        aria-selected={isSelected}
        tabIndex={-1}
      >
        <div
          css={[
            styles.row,
            isAutoHeight && styles.rowAutoHeight,
            isExpanded && styles.rowExpanded,
            isSelected && styles.selectedRow,
          ]}
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
              isAutoHeight={isAutoHeight}
              onFilter={onFilter}
              setPopoverState={setPopoverState}
              findTerm={findTerm}
              findActiveMatch={findActiveMatch}
              rowIndex={virtualRow.index}
              getColumnStyle={getColumnStyle}
              isRowSelected={isSelected}
            />
          ))}
        </div>
      </div>
    );
  })
);
VirtualRow.displayName = 'VirtualRow';

// ── Virtual cell with cell actions, popover, and focus support ──
const VirtualCell = React.memo(
  ({
    cell,
    styles,
    isFocused,
    isAutoHeight,
    onFilter,
    setPopoverState,
    findTerm,
    findActiveMatch,
    rowIndex,
    getColumnStyle,
    isRowSelected,
  }: {
    cell: Cell<DataTableRecord, unknown>;
    styles: ReturnType<typeof getTanStackDataGridStyles>;
    isFocused: boolean;
    isAutoHeight?: boolean;
    onFilter?: UnifiedDataTableProps['onFilter'];
    setPopoverState?: (
      state: { fieldName: string; value: unknown; formattedValue: string; rect: DOMRect } | null
    ) => void;
    findTerm?: string;
    findActiveMatch?: FindMatch | null;
    rowIndex?: number;
    getColumnStyle: TanStackColumnLayout['getColumnStyle'];
    isRowSelected: boolean;
  }) => {
    const isControl = cell.column.columnDef.meta?.isControl;
    const isSelect = cell.column.columnDef.meta?.isSelect;
    const isSummary = cell.column.columnDef.meta?.isSummary;
    const columnStyle = getColumnStyle({
      id: cell.column.id,
      isSummary,
      isTimestamp: cell.column.columnDef.meta?.isTimestamp,
    });

    if (isControl || isSelect) {
      return (
        <div
          css={[isSelect ? styles.selectCell : styles.controlCell, isFocused && styles.focusedCell]}
          style={{
            width: isSelect ? SELECT_COL_WIDTH : cell.column.getSize(),
            flexShrink: 0,
          }}
          role="gridcell"
          aria-selected={isSelect ? isRowSelected : undefined}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      );
    }

    if (isSummary) {
      const openSummaryPopover = (el: HTMLElement) => {
        if (setPopoverState) {
          setPopoverState({
            fieldName: '_source',
            value: Object.entries(cell.row.original.flattened)
              .map(([k, v]) => `${k}: ${formatCellValue(v)}`)
              .join('\n'),
            formattedValue: Object.entries(cell.row.original.flattened)
              .map(([k, v]) => `${k}: ${formatCellValue(v)}`)
              .join('\n'),
            rect: el.getBoundingClientRect(),
          });
        }
      };

      return (
        <div
          css={[styles.summaryCell, styles.expandableCell, isFocused && styles.focusedCell]}
          role="gridcell"
          style={columnStyle}
          tabIndex={0}
          onClick={(e) => openSummaryPopover(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === keys.ENTER || e.key === keys.SPACE) {
              e.preventDefault();
              openSummaryPopover(e.currentTarget);
            }
          }}
        >
          <div css={isAutoHeight ? styles.summaryCellContentAuto : styles.summaryCellContent}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        </div>
      );
    }

    const fieldName = cell.column.columnDef.meta?.fieldName;
    const value = cell.getValue();
    const colId = cell.column.id;
    const rowId = cell.row.original.id;
    const formatted = cell.column.columnDef.meta?.formatValue?.(value) ?? formatCellValue(value);
    const isActiveHighlight =
      findTerm &&
      findActiveMatch &&
      findActiveMatch.rowIndex === rowIndex &&
      findActiveMatch.fieldName === colId;

    const openCellPopover = (el: HTMLElement) => {
      if (fieldName && setPopoverState) {
        setPopoverState({
          fieldName,
          value,
          formattedValue: formatted,
          rect: el.getBoundingClientRect(),
        });
      }
    };

    return (
      <div
        css={[
          styles.cell,
          styles.cellWithActions,
          styles.expandableCell,
          isFocused && styles.focusedCell,
        ]}
        style={columnStyle}
        role="gridcell"
        data-row-id={rowId}
        data-col-id={colId}
        tabIndex={0}
        onClick={(e) => openCellPopover(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === keys.ENTER || e.key === keys.SPACE) {
            e.preventDefault();
            openCellPopover(e.currentTarget);
          }
        }}
      >
        <div css={isAutoHeight ? styles.cellContentAuto : styles.cellContent}>
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
            formattedValue={formatted}
            onFilter={onFilter}
            onExpand={() => {
              const el = document.querySelector(`[data-row-id="${rowId}"][data-col-id="${colId}"]`);
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
    setRenderDocumentViewMeta,
    loadingState,
    onFilter,
    getRowIndicator,
    rowAdditionalLeadingControls,
    dataGridDensityState,
    onUpdateDataGridDensity,
    rowHeightState,
    onUpdateRowHeight,
    configRowHeight,
    headerRowHeightState,
    onUpdateHeaderRowHeight,
    configHeaderRowHeight,
    maxAllowedSampleSize,
    sampleSizeState = 500,
    onUpdateSampleSize,
    onFullScreenChange,
    services,
    onFieldEdited,
    shouldKeepAdHocDataViewImmutable,
    consumer = 'discover',
    externalAdditionalControls,
    gridImplementationSwitch,
    toolbarLeftSide,
    toolbarTrailingControl,
    showKeyboardShortcuts = true,
    showSummaryColumnToggle = false,
    enableComparisonMode = false,
    ariaLabelledBy = 'documentsAriaLabel',
    showFullScreenButton = true,
  }) => {
    const euiThemeContext = useEuiTheme();
    const { euiTheme } = euiThemeContext;
    const { fieldFormats, storage, toastNotifications, dataViewFieldEditor, data } = services;
    const parentRef = useRef<HTMLDivElement | null>(null);
    const dataGridId = useGeneratedHtmlId({ prefix: `${consumer}TanStackGrid` });
    const styles = useMemo(() => getTanStackDataGridStyles(euiTheme), [euiTheme]);

    const scrollKey = dataView.id ?? dataView.title;
    const timeFieldName = dataView.timeFieldName;

    // ── Find in table ──
    const [isFindOpen, setIsFindOpen] = useState(false);
    const [findTerm, setFindTerm] = useState('');
    const [findActiveIndex, setFindActiveIndex] = useState(0);

    const displayedColumns = useMemo(
      () => getDisplayedColumns(columns, dataView),
      [columns, dataView]
    );

    const shouldPrependTimeFieldColumn = useMemo(
      () =>
        canPrependTimeFieldColumn(
          displayedColumns,
          timeFieldName,
          columnsMeta,
          showTimeCol,
          Boolean(isPlainRecord)
        ),
      [columnsMeta, displayedColumns, isPlainRecord, showTimeCol, timeFieldName]
    );

    const isSummaryMode = displayedColumns.length === 1 && displayedColumns[0] === SOURCE_COLUMN_ID;
    const showSummaryColumn = displayedColumns.includes(SOURCE_COLUMN_ID);

    // STATS ... BY column reordering
    const statsByInfo = useMemo(
      () => (!isSummaryMode ? parseStatsByColumns(query, displayedColumns) : undefined),
      [query, displayedColumns, isSummaryMode]
    );

    const effectiveColumns = useMemo(() => {
      const columnSource = statsByInfo?.orderedColumns ?? displayedColumns;

      return getVisibleColumns(columnSource, dataView, shouldPrependTimeFieldColumn);
    }, [dataView, displayedColumns, shouldPrependTimeFieldColumn, statsByInfo?.orderedColumns]);

    const persistVisibleColumns = useCallback(
      (nextVisibleColumns: string[]) => {
        onSetColumns?.(nextVisibleColumns, false);
      },
      [onSetColumns]
    );

    const onChangeShowSummaryColumn = useCallback(
      (show: boolean) => {
        const withoutSource = effectiveColumns.filter((column) => column !== SOURCE_COLUMN_ID);
        const nextColumns = show ? [...withoutSource, SOURCE_COLUMN_ID] : withoutSource;
        const shouldPrependTime = canPrependTimeFieldColumn(
          nextColumns,
          timeFieldName,
          columnsMeta,
          showTimeCol,
          Boolean(isPlainRecord)
        );

        onSetColumns?.(nextColumns, !shouldPrependTime);
      },
      [columnsMeta, effectiveColumns, isPlainRecord, onSetColumns, showTimeCol, timeFieldName]
    );

    // ── Row selection ──
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [isFilterActive, setIsFilterActive] = useState(false);
    const [isCompareActive, setIsCompareActive] = useState(false);
    const lastSelectedRowIndexRef = useRef<number | null>(null);
    const availableRowIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);
    const displayedRows = useMemo(
      () => (isFilterActive ? rows.filter((row) => selectedRows.has(row.id)) : rows),
      [isFilterActive, rows, selectedRows]
    );
    const allSelected =
      displayedRows.length > 0 && displayedRows.every((row) => selectedRows.has(row.id));
    const someSelected = selectedRows.size > 0 && !allSelected;

    const toggleSelectRow = useCallback(
      (rowId: string, rowIndex: number, selectRange: boolean) => {
        setSelectedRows((previousSelectedRows) => {
          const nextSelectedRows = new Set(previousSelectedRows);
          const shouldSelect = !nextSelectedRows.has(rowId);
          const previousRowIndex = lastSelectedRowIndexRef.current;

          if (selectRange && previousRowIndex !== null) {
            const startIndex = Math.min(previousRowIndex, rowIndex);
            const endIndex = Math.max(previousRowIndex, rowIndex);
            displayedRows.slice(startIndex, endIndex + 1).forEach((row) => {
              if (shouldSelect) nextSelectedRows.add(row.id);
              else nextSelectedRows.delete(row.id);
            });
          } else if (shouldSelect) {
            nextSelectedRows.add(rowId);
          } else {
            nextSelectedRows.delete(rowId);
          }

          return nextSelectedRows;
        });
        lastSelectedRowIndexRef.current = rowIndex;
      },
      [displayedRows]
    );

    const toggleSelectAll = useCallback(() => {
      setSelectedRows((previousSelectedRows) => {
        const nextSelectedRows = new Set(previousSelectedRows);
        if (displayedRows.every((row) => nextSelectedRows.has(row.id))) {
          displayedRows.forEach((row) => nextSelectedRows.delete(row.id));
        } else {
          displayedRows.forEach((row) => nextSelectedRows.add(row.id));
        }
        return nextSelectedRows;
      });
    }, [displayedRows]);

    const clearSelection = useCallback(() => {
      setSelectedRows(new Set());
      setIsFilterActive(false);
      lastSelectedRowIndexRef.current = null;
    }, []);

    useEffect(() => {
      setSelectedRows((previousSelectedRows) => {
        const nextSelectedRows = new Set(
          Array.from(previousSelectedRows).filter((rowId) => availableRowIds.has(rowId))
        );
        return nextSelectedRows.size === previousSelectedRows.size
          ? previousSelectedRows
          : nextSelectedRows;
      });
    }, [availableRowIds]);

    useEffect(() => {
      if (selectedRows.size === 0) {
        setIsFilterActive(false);
        setIsCompareActive(false);
      }
    }, [selectedRows.size]);

    const selectedRowsRef = useRef(selectedRows);
    selectedRowsRef.current = selectedRows;

    const toggleSelectRowRef = useRef(toggleSelectRow);
    toggleSelectRowRef.current = toggleSelectRow;

    // Find matches
    const findMatches = useMemo(
      () => scanMatches(displayedRows, effectiveColumns, findTerm, isSummaryMode),
      [displayedRows, effectiveColumns, findTerm, isSummaryMode]
    );
    const findActiveMatch = findMatches[findActiveIndex] ?? null;

    const handleFindSearch = useCallback((term: string) => {
      setFindTerm(term);
      setFindActiveIndex(0);
    }, []);
    const handleFindNext = useCallback(() => {
      setFindActiveIndex((prev) =>
        findMatches.length === 0 ? 0 : (prev + 1) % findMatches.length
      );
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

    const shouldShowFieldHandler = useMemo(() => {
      const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
      return getShouldShowFieldHandler(dataViewFields, dataView, true);
    }, [dataView]);

    // ── Full-screen mode ──
    const [isFullScreen, setIsFullScreen] = useState(false);
    const toggleFullScreen = useCallback(() => {
      setIsFullScreen((previousIsFullScreen) => {
        const nextIsFullScreen = !previousIsFullScreen;
        onFullScreenChange?.(nextIsFullScreen);
        return nextIsFullScreen;
      });
    }, [onFullScreenChange]);

    // ── Grid density (shared with UnifiedDataTable) ──
    const { dataGridDensity, onChangeDataGridDensity } = useDataGridDensity({
      storage,
      consumer,
      dataGridDensityState,
      onUpdateDataGridDensity,
    });
    const [isDensityPopoverOpen, setIsDensityPopoverOpen] = useState(false);
    const [isColumnsPopoverOpen, setIsColumnsPopoverOpen] = useState(false);
    const [isSortPopoverOpen, setIsSortPopoverOpen] = useState(false);
    const [isSelectionPopoverOpen, setIsSelectionPopoverOpen] = useState(false);
    const [isKeyboardShortcutsOpen, setIsKeyboardShortcutsOpen] = useState(false);
    const densityCfg = useMemo(() => {
      const isCompact = dataGridDensity === DataGridDensity.COMPACT;
      const padding = getDataGridDensityPadding(euiTheme, dataGridDensity);
      const typographyScale = isCompact ? 'xs' : 's';
      const { fontSize, lineHeight: headerLineHeight } = euiFontSize(
        euiThemeContext,
        typographyScale,
        { unit: 'px' }
      );
      const cellPadding = parseFloat(padding);
      const fontSizeValue = String(fontSize ?? (isCompact ? '12px' : '14px'));
      const numericFontSize = parseFloat(fontSizeValue);
      const numericHeaderLineHeight = parseFloat(String(headerLineHeight));
      // Unified data table values use the code typography line height rather than
      // the tighter header typography line height.
      const numericLineHeight = numericFontSize * 1.6;

      return {
        rowHeight: Math.floor(numericLineHeight + cellPadding * 2),
        summaryRowHeight: Math.floor(numericLineHeight * 3 + cellPadding * 2),
        fontSize: numericFontSize,
        lineHeight: numericLineHeight,
        headerLineHeight: numericHeaderLineHeight,
        cellPadding,
        icon: DENSITY_ICONS[dataGridDensity],
      };
    }, [dataGridDensity, euiTheme, euiThemeContext]);

    const {
      rowHeight: headerRowHeight,
      rowHeightLines: headerRowHeightLines,
      lineCountInput: headerLineCountInput,
      onChangeRowHeight: onChangeHeaderRowHeight,
      onChangeRowHeightLines: onChangeHeaderRowHeightLines,
    } = useRowHeight({
      type: RowHeightType.header,
      storage,
      consumer,
      key: 'dataGridHeaderRowHeight',
      defaultRowHeight: 1,
      configRowHeight: configHeaderRowHeight,
      rowHeightState: headerRowHeightState,
      onUpdateRowHeight: onUpdateHeaderRowHeight,
    });

    const { rowHeight, rowHeightLines, lineCountInput, onChangeRowHeight, onChangeRowHeightLines } =
      useRowHeight({
        type: RowHeightType.row,
        storage,
        consumer,
        key: 'dataGridRowHeight',
        defaultRowHeight: ROWS_HEIGHT_OPTIONS.default,
        configRowHeight,
        rowHeightState,
        onUpdateRowHeight,
      });

    const isAutoRowHeight = rowHeightLines === ROWS_HEIGHT_OPTIONS.auto;
    const isAutoHeaderRowHeight = headerRowHeightLines === ROWS_HEIGHT_OPTIONS.auto;

    // ── Cell popover ──
    const [popoverState, setPopoverState] = useState<{
      fieldName: string;
      value: unknown;
      formattedValue: string;
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
            persistVisibleColumns(newCols);
          }
        }
        return { dragging: null, over: null };
      });
    }, [effectiveColumns, onSetColumns, persistVisibleColumns]);

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
        const next = typeof updater === 'function' ? updater(sortingStateRef.current) : updater;
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

    // When the document view is rendered externally, we need to provide some metadata
    // to the consumer to allow them to properly render the doc viewer component
    const prevRenderDocumentViewMeta = useRef<RenderDocumentViewMeta>();

    useEffect(() => {
      if (renderDocumentView !== 'external' || !setRenderDocumentViewMeta) {
        prevRenderDocumentViewMeta.current = undefined;
        return;
      }

      if (!expandedDoc) {
        prevRenderDocumentViewMeta.current = undefined;
        setRenderDocumentViewMeta(undefined);
        return;
      }

      const prevMeta = prevRenderDocumentViewMeta.current;
      const metaChanged =
        prevMeta?.displayedColumns !== displayedColumns ||
        prevMeta?.displayedRows !== displayedRows;

      if (metaChanged) {
        const nextMeta: RenderDocumentViewMeta = {
          displayedColumns,
          displayedRows,
        };
        setRenderDocumentViewMeta(nextMeta);
        prevRenderDocumentViewMeta.current = nextMeta;
      }
    }, [
      displayedColumns,
      displayedRows,
      expandedDoc,
      renderDocumentView,
      setRenderDocumentViewMeta,
    ]);

    const onFilterRef = useRef(onFilter);
    onFilterRef.current = onFilter;

    const stopPropagation = useCallback((e: React.SyntheticEvent) => e.stopPropagation(), []);

    const valueToStringConverter: ValueToStringConverter = useCallback(
      (rowIndex, columnId, options) =>
        convertValueToString({
          rowIndex,
          rows,
          dataView,
          columnId,
          fieldFormats,
          columnsMeta,
          options,
        }),
      [columnsMeta, dataView, fieldFormats, rows]
    );

    const closeFieldEditor = useRef<() => void | undefined>();

    useEffect(() => {
      return () => {
        closeFieldEditor.current?.();
      };
    }, []);

    const editField = useMemo(
      () =>
        onFieldEdited
          ? async (fieldName: string) => {
              const editedDataView = shouldKeepAdHocDataViewImmutable
                ? await prepareDataViewForEditing(dataView, data.dataViews)
                : dataView;
              closeFieldEditor.current =
                onFieldEdited &&
                (await services.dataViewFieldEditor?.openEditor({
                  ctx: {
                    dataView: editedDataView,
                  },
                  fieldName,
                  onSave: async () => {
                    await onFieldEdited({
                      editedDataView,
                    });
                  },
                }));
            }
          : undefined,
      [
        data.dataViews,
        dataView,
        onFieldEdited,
        services.dataViewFieldEditor,
        shouldKeepAdHocDataViewImmutable,
      ]
    );

    const hasEditDataViewPermission = useCallback(
      () => Boolean(dataViewFieldEditor?.userPermissions?.editIndexPattern()),
      [dataViewFieldEditor]
    );

    const actionsColumnWidth =
      CONTROL_COL_WIDTH +
      (rowAdditionalLeadingControls?.reduce(
        (width, control) => width + (control.width ?? CONTROL_COL_WIDTH),
        0
      ) ?? 0);

    // ── Build TanStack column defs ──
    const tanstackColumns: ColumnDef<DataTableRecord>[] = useMemo(() => {
      const defs: ColumnDef<DataTableRecord>[] = [];

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
              onChange={(event) =>
                toggleSelectRowRef.current(
                  record.id,
                  row.index,
                  (event.nativeEvent as MouseEvent).shiftKey
                )
              }
              aria-label={`Select row ${row.index + 1}`}
            />
          );
        },
      });

      // Actions column: details and profile-provided row actions.
      defs.push({
        id: EXPAND_COLUMN_ID,
        header: () => (
          <EuiIconTip
            type="info"
            content={i18n.translate('discover.grid.tanStack.actionsColumnTooltip', {
              defaultMessage: 'Actions',
            })}
          />
        ),
        size: actionsColumnWidth,
        minSize: actionsColumnWidth,
        maxSize: actionsColumnWidth,
        enableResizing: false,
        enableSorting: false,
        meta: { isControl: true },
        cell: function ExpandCell({ row }) {
          const record = row.original;
          const isExp = expandedDocRef.current?.id === record.id;
          const rowProps = { record, rowIndex: row.index };
          const availableControls =
            rowAdditionalLeadingControls?.filter(
              (control) => control.isAvailable?.(rowProps) ?? true
            ) ?? [];
          const Control: React.FC<RowControlProps> = ({
            color,
            'data-test-subj': dataTestSubj,
            disabled,
            iconType,
            label,
            onClick,
            tooltipContent,
            ...controlProps
          }) => {
            const button = (
              <EuiButtonIcon
                {...controlProps}
                aria-label={label}
                color={color ?? 'text'}
                data-test-subj={dataTestSubj}
                disabled={disabled}
                iconSize="s"
                iconType={iconType}
                size="xs"
                onClick={() => onClick?.(rowProps)}
              />
            );

            return tooltipContent ? (
              <EuiToolTip content={tooltipContent}>{button}</EuiToolTip>
            ) : (
              button
            );
          };

          return (
            <EuiFlexGroup responsive={false} gutterSize="none" alignItems="center" wrap={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip content="Toggle document details" disableScreenReaderOutput>
                  <EuiButtonIcon
                    size="xs"
                    iconSize="s"
                    aria-label="Toggle document details"
                    data-test-subj="docTableExpandToggleColumn"
                    onClick={() => toggleExpandDocRef.current(record)}
                    onKeyDown={(event: React.KeyboardEvent) => {
                      if (event.key === keys.ENTER || event.key === keys.SPACE) {
                        event.preventDefault();
                        toggleExpandDocRef.current(record);
                      }
                    }}
                    color={isExp ? 'primary' : 'text'}
                    iconType={isExp ? 'minimize' : 'maximize'}
                    isSelected={isExp}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              {availableControls.map((control) => (
                <EuiFlexItem key={control.id} grow={false}>
                  {control.render(Control, rowProps)}
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          );
        },
      });

      const summaryColumn: ColumnDef<DataTableRecord> = {
        id: SOURCE_COLUMN_ID,
        header: () => <UnifiedDataTableSourceColumnHeader headerRowHeight={headerRowHeightLines} />,
        size: 1,
        minSize: 0,
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
      };

      if (isSummaryMode) {
        if (showTimeCol && timeFieldName) {
          const timeField = dataView.getFieldByName(timeFieldName);
          const formatTimeValue = (value: unknown) => {
            const timeValue = Array.isArray(value) && value.length === 1 ? value[0] : value;
            return timeField && fieldFormats
              ? formatFieldValueText({ value: timeValue, fieldFormats, dataView, field: timeField })
              : formatTimestamp(timeValue);
          };
          defs.push({
            id: timeFieldName,
            accessorFn: (r) => r.flattened[timeFieldName],
            header: timeFieldName,
            size: getTimeColumnWidth(timeFieldName, columnSizing, settings),
            minSize: MIN_COL_WIDTH,
            enableSorting: false,
            meta: { isTimestamp: true, fieldName: timeFieldName, formatValue: formatTimeValue },
            cell: ({ getValue }) => (
              <span css={styles.timestampCell}>{formatTimeValue(getValue())}</span>
            ),
          });
        }

        defs.push(summaryColumn);
      } else {
        for (const colId of effectiveColumns) {
          if (colId === SOURCE_COLUMN_ID) {
            defs.push(summaryColumn);
            continue;
          }
          const isTimeField = colId === timeFieldName;
          const dataViewField = dataView.getFieldByName(colId);
          const formatValue = (value: unknown) => {
            const fieldValue =
              isTimeField && Array.isArray(value) && value.length === 1 ? value[0] : value;
            if (dataViewField && fieldFormats) {
              return formatFieldValueText({
                value: fieldValue,
                fieldFormats,
                dataView,
                field: dataViewField,
              });
            }
            return isTimeField ? formatTimestamp(fieldValue) : formatCellValue(fieldValue);
          };
          const columnSchema = getSchemaByKbnType(dataViewField?.type);
          const columnIsSortable =
            isSortEnabled &&
            isSortable({
              isPlainRecord,
              columnName: colId,
              columnSchema,
              dataViewField,
            });

          defs.push({
            id: colId,
            accessorFn: (r) => r.flattened[colId],
            header: settings?.columns?.[colId]?.display ?? colId,
            size: isTimeField
              ? getTimeColumnWidth(timeFieldName, columnSizing, settings)
              : settings?.columns?.[colId]?.width ?? DEFAULT_COL_WIDTH,
            minSize: MIN_COL_WIDTH,
            enableSorting: columnIsSortable,
            meta: { isTimestamp: isTimeField, fieldName: colId, formatValue },
            cell: function DataCell({ getValue }) {
              const val = getValue();
              const formatted = formatValue(val);
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
      isSortEnabled,
      isSummaryMode,
      settings,
      shouldShowFieldHandler,
      showTimeCol,
      styles,
      isPlainRecord,
      columnSizing,
      timeFieldName,
      rowAdditionalLeadingControls,
      headerRowHeightLines,
      actionsColumnWidth,
    ]);

    const dataColumns = useMemo<TanStackDataColumnDescriptor[]>(() => {
      if (isSummaryMode) {
        const cols: Array<{ id: string; isSummary?: boolean; isTimestamp?: boolean }> = [];
        if (showTimeCol && timeFieldName) {
          cols.push({ id: timeFieldName, isTimestamp: true });
        }
        cols.push({ id: SOURCE_COLUMN_ID, isSummary: true });
        return cols;
      }

      return effectiveColumns.map((colId) => ({
        id: colId,
        isSummary: colId === SOURCE_COLUMN_ID,
        isTimestamp: colId === timeFieldName,
      }));
    }, [effectiveColumns, isSummaryMode, showTimeCol, timeFieldName]);

    const [containerWidth, setContainerWidth] = useState(0);

    useEffect(() => {
      const scrollEl = parentRef.current;
      if (!scrollEl) return;

      const updateWidth = () => setContainerWidth(scrollEl.clientWidth);
      updateWidth();

      const observer = new ResizeObserver(updateWidth);
      observer.observe(scrollEl);
      return () => observer.disconnect();
    }, [displayedRows.length]);

    const columnLayout = useMemo(
      () =>
        computeTanStackColumnLayout({
          containerWidth,
          dataColumns,
          timeFieldName: showTimeCol ? timeFieldName : undefined,
          columnSizing,
          settings,
          leadingControlColumnsWidth: SELECT_COL_WIDTH + actionsColumnWidth,
        }),
      [
        actionsColumnWidth,
        containerWidth,
        dataColumns,
        columnSizing,
        settings,
        showTimeCol,
        timeFieldName,
      ]
    );

    // ── React Table instance ──
    const table = useReactTable({
      data: displayedRows,
      columns: tanstackColumns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: isSortEnabled && !isSummaryMode ? getSortedRowModel() : undefined,
      state: { sorting: sortingState, columnSizing },
      onSortingChange: handleSortingChange,
      onColumnSizingChange: handleColumnSizingChange,
      columnResizeMode: 'onChange',
      enableColumnResizing: true,
      enableSorting: isSortEnabled && !isSummaryMode,
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
    const baseRowHeight = useMemo(() => {
      if (isAutoRowHeight) {
        return isSummaryMode ? densityCfg.summaryRowHeight : densityCfg.rowHeight;
      }
      if (rowHeightLines <= 1) {
        return densityCfg.rowHeight;
      }
      return Math.floor(densityCfg.cellPadding * 2 + densityCfg.lineHeight * rowHeightLines);
    }, [rowHeightLines, densityCfg, isAutoRowHeight, isSummaryMode]);
    const totalColCount = table.getVisibleLeafColumns().length;

    const getRowHeight = useCallback((): number => {
      return baseRowHeight;
    }, [baseRowHeight]);

    // ── Virtualizer ──
    const rowVirtualizer = useVirtualizer({
      count: tableRows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: getRowHeight,
      overscan: OVERSCAN,
      initialOffset: scrollPositionCache.get(scrollKey) ?? 0,
      getItemKey: (index) => displayedRows[index]?.id ?? index,
    });

    useEffect(() => {
      rowVirtualizer.measure();
    }, [dataGridDensity, rowHeightLines, rowVirtualizer]);

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
    const isEmpty = !isLoading && displayedRows.length === 0;
    const totalWidth = columnLayout.gridWidth;
    const getColumnStyle = columnLayout.getColumnStyle;
    const headerSortEnabled = isSortEnabled && !(isPlainRecord && isSummaryMode);

    const densityVars = useMemo(
      () =>
        ({
          '--tsg-font-size': `${densityCfg.fontSize}px`,
          '--tsg-line-height': `${densityCfg.lineHeight}px`,
          '--tsg-header-line-height': `${densityCfg.headerLineHeight}px`,
          '--tsg-cell-padding-v': `${densityCfg.cellPadding}px`,
          '--tsg-cell-padding-h': `${densityCfg.cellPadding}px`,
          '--tsg-header-max-lines': isAutoHeaderRowHeight
            ? 'none'
            : String(Math.max(headerRowHeightLines, 1)),
          '--tsg-body-max-lines': isAutoRowHeight ? 'none' : String(Math.max(rowHeightLines, 1)),
          '--tsg-row-min-height': `${densityCfg.rowHeight}px`,
        } as React.CSSProperties),
      [densityCfg, headerRowHeightLines, rowHeightLines, isAutoHeaderRowHeight, isAutoRowHeight]
    );

    // ── Selected rows actions ──
    const selectedRowIndices = useMemo(
      () =>
        rows.reduce<number[]>((indices, row, index) => {
          if (selectedRows.has(row.id)) indices.push(index);
          return indices;
        }, []),
      [rows, selectedRows]
    );
    const selectedRecords = useMemo(
      () => rows.filter((row) => selectedRows.has(row.id)),
      [rows, selectedRows]
    );
    const copyColumns = useMemo(
      () =>
        uniq(
          effectiveColumns.flatMap((column) =>
            column === SOURCE_COLUMN_ID
              ? Object.keys(calcFieldCounts(displayedRows)).sort()
              : [column]
          )
        ),
      [displayedRows, effectiveColumns]
    );
    const copySelectedAsText = useCallback(
      async (format: CopyAsTextFormat) => {
        await copyRowsAsTextToClipboard({
          format,
          columns: copyColumns,
          dataView,
          selectedRowIndices,
          toastNotifications,
          valueToStringConverter,
        });
      },
      [copyColumns, dataView, selectedRowIndices, toastNotifications, valueToStringConverter]
    );
    const copySelectedAsJson = useCallback(async () => {
      await copyRowsAsJsonToClipboard({ selectedRows: selectedRecords, toastNotifications });
    }, [selectedRecords, toastNotifications]);

    const selectedDocIds = useMemo(() => Array.from(selectedRows), [selectedRows]);
    const docMap = useMemo<DocMap>(
      () => new Map(rows.map((doc, docIndex) => [doc.id, { doc, docIndex }])),
      [rows]
    );
    const replaceSelectedDocs = useCallback((docIds: string[]) => {
      setSelectedRows(new Set(docIds));
    }, []);
    const schemaDetectors = useMemo(() => getSchemaDetectors(), []);

    const isLoadingMore = loadingState === DataLoadingState.loadingMore;
    const displayPopoverWidth = mathWithUnits(
      [euiTheme.components.forms.maxWidth, euiTheme.size.s],
      (formMaxWidth, padding) => formMaxWidth + padding * 2
    );
    const copyJsonLabel = isPlainRecord
      ? i18n.translate('discover.grid.tanStack.copyResultsAsJsonButtonLabel', {
          defaultMessage: 'Copy results as JSON',
        })
      : i18n.translate('discover.grid.tanStack.copyDocumentsAsJsonButtonLabel', {
          defaultMessage: 'Copy documents as JSON',
        });
    const showSelectedDocumentsLabel = isPlainRecord
      ? i18n.translate('discover.grid.tanStack.showSelectedResultsButtonLabel', {
          defaultMessage: 'Show selected results only',
        })
      : i18n.translate('discover.grid.tanStack.showSelectedDocumentsButtonLabel', {
          defaultMessage: 'Show selected documents only',
        });
    const showAllDocumentsLabel = isPlainRecord
      ? i18n.translate('discover.grid.tanStack.showAllResultsButtonLabel', {
          defaultMessage: 'Show all results',
        })
      : i18n.translate('discover.grid.tanStack.showAllDocumentsButtonLabel', {
          defaultMessage: 'Show all documents',
        });

    if (isCompareActive) {
      return (
        <div
          ref={wrapperRef}
          className={isFullScreen ? 'euiDataGrid--fullScreen' : undefined}
          css={[styles.wrapper, isFullScreen && styles.fullScreen]}
          style={densityVars}
          data-test-subj="tanstackGridWrapper"
        >
          <CompareDocuments
            id={dataGridId}
            wrapper={wrapperRef.current}
            consumer={consumer}
            ariaDescribedBy={ariaLabelledBy}
            ariaLabelledBy={ariaLabelledBy}
            dataView={dataView}
            columnsMeta={columnsMeta}
            isPlainRecord={Boolean(isPlainRecord)}
            selectedFieldNames={effectiveColumns}
            selectedDocIds={selectedDocIds}
            schemaDetectors={schemaDetectors}
            forceShowAllFields={isSummaryMode}
            showFullScreenButton={showFullScreenButton}
            fieldFormats={fieldFormats}
            docMap={docMap}
            replaceSelectedDocs={replaceSelectedDocs}
            setIsCompareActive={setIsCompareActive}
          />
        </div>
      );
    }

    return (
      <div
        ref={wrapperRef}
        className={isFullScreen ? 'euiDataGrid--fullScreen' : undefined}
        css={[styles.wrapper, isFullScreen && styles.fullScreen]}
        style={densityVars}
        data-test-subj="tanstackGridWrapper"
      >
        {/* Toolbar */}
        <div css={styles.toolbar}>
          <EuiFlexGroup
            css={styles.toolbarLeadingControls}
            alignItems="center"
            gutterSize="s"
            responsive={false}
            wrap={false}
          >
            {toolbarLeftSide && <EuiFlexItem grow={false}>{toolbarLeftSide}</EuiFlexItem>}
            {externalAdditionalControls && (
              <EuiFlexItem grow={false}>{externalAdditionalControls}</EuiFlexItem>
            )}
            <EuiFlexItem css={styles.toolbarSpacer} />
            {selectedRows.size > 0 && (
              <EuiFlexItem grow={false} css={styles.toolbarControlButton}>
                <EuiPopover
                  css={styles.toolbarPopover}
                  aria-label={i18n.translate(
                    'discover.grid.tanStack.selectedDocumentsPopoverAriaLabel',
                    { defaultMessage: 'Selected documents actions' }
                  )}
                  button={
                    <EuiDataGridToolbarControl
                      css={styles.toolbarTextControl}
                      iconType="chevronSingleDown"
                      iconSide="right"
                      isSelected={isFilterActive}
                      data-selected-documents={selectedRows.size}
                      onClick={() => setIsSelectionPopoverOpen((isOpen) => !isOpen)}
                      data-test-subj="unifiedDataTableSelectionBtn"
                    >
                      <span css={styles.selectionToolbarControlLabel}>
                        <EuiNotificationBadge
                          size="m"
                          color="subdued"
                          aria-label={i18n.translate(
                            'discover.grid.tanStack.selectedDocumentsCountLabel',
                            {
                              defaultMessage: '{count} selected documents',
                              values: { count: selectedRows.size },
                            }
                          )}
                        >
                          {selectedRows.size}
                        </EuiNotificationBadge>
                        {i18n.translate('discover.grid.tanStack.selectedDocumentsButtonLabel', {
                          defaultMessage: 'Selected',
                        })}
                      </span>
                    </EuiDataGridToolbarControl>
                  }
                  isOpen={isSelectionPopoverOpen}
                  closePopover={() => setIsSelectionPopoverOpen(false)}
                  panelPaddingSize="none"
                  anchorPosition="downLeft"
                >
                  <EuiContextMenuPanel
                    data-test-subj="unifiedDataTableSelectionMenu"
                    items={[
                      ...(enableComparisonMode && selectedRows.size > 1
                        ? [
                            <EuiContextMenuItem
                              key="compareSelected"
                              icon="compare"
                              disabled={selectedRows.size > MAX_SELECTED_DOCS_FOR_COMPARE}
                              data-test-subj="unifiedDataTableCompareSelectedDocuments"
                              onClick={() => {
                                setIsSelectionPopoverOpen(false);
                                setIsCompareActive(true);
                              }}
                            >
                              {selectedRows.size > MAX_SELECTED_DOCS_FOR_COMPARE ? (
                                <EuiToolTip
                                  content={i18n.translate(
                                    'discover.grid.tanStack.compareSelectedDisabledTooltip',
                                    {
                                      defaultMessage: 'Comparison is limited to {limit} rows',
                                      values: { limit: MAX_SELECTED_DOCS_FOR_COMPARE },
                                    }
                                  )}
                                >
                                  <span tabIndex={0}>
                                    {i18n.translate(
                                      'discover.grid.tanStack.compareSelectedButtonLabel',
                                      { defaultMessage: 'Compare selected' }
                                    )}
                                  </span>
                                </EuiToolTip>
                              ) : (
                                i18n.translate(
                                  'discover.grid.tanStack.compareSelectedButtonLabel',
                                  { defaultMessage: 'Compare selected' }
                                )
                              )}
                            </EuiContextMenuItem>,
                          ]
                        : []),
                      <EuiContextMenuItem
                        key="copyAsText"
                        icon="copy"
                        data-test-subj="unifiedDataTableCopyRowsAsText"
                        onClick={async () => {
                          await copySelectedAsText(CopyAsTextFormat.tabular);
                          setIsSelectionPopoverOpen(false);
                        }}
                      >
                        {i18n.translate('discover.grid.tanStack.copySelectionAsTextButtonLabel', {
                          defaultMessage: 'Copy selection as text',
                        })}
                      </EuiContextMenuItem>,
                      <EuiContextMenuItem
                        key="copyAsMarkdown"
                        icon="copy"
                        data-test-subj="unifiedDataTableCopyRowsAsMarkdown"
                        onClick={async () => {
                          await copySelectedAsText(CopyAsTextFormat.markdown);
                          setIsSelectionPopoverOpen(false);
                        }}
                      >
                        {i18n.translate(
                          'discover.grid.tanStack.copySelectionAsMarkdownButtonLabel',
                          { defaultMessage: 'Copy selection as Markdown' }
                        )}
                      </EuiContextMenuItem>,
                      <EuiContextMenuItem
                        key="copyAsJson"
                        icon="copy"
                        data-test-subj="dscGridCopySelectedDocumentsJSON"
                        onClick={async () => {
                          await copySelectedAsJson();
                          setIsSelectionPopoverOpen(false);
                        }}
                      >
                        {copyJsonLabel}
                      </EuiContextMenuItem>,
                      <EuiContextMenuItem
                        key={isFilterActive ? 'showAllDocuments' : 'showSelectedDocuments'}
                        icon="eye"
                        data-test-subj={
                          isFilterActive
                            ? 'dscGridShowAllDocuments'
                            : 'dscGridShowSelectedDocuments'
                        }
                        onClick={() => {
                          setIsSelectionPopoverOpen(false);
                          setIsFilterActive((isActive) => !isActive);
                        }}
                      >
                        {isFilterActive ? showAllDocumentsLabel : showSelectedDocumentsLabel}
                      </EuiContextMenuItem>,
                      <EuiContextMenuItem
                        key="clearSelection"
                        icon="cross"
                        data-test-subj="dscGridClearSelectedDocuments"
                        onClick={() => {
                          clearSelection();
                          setIsSelectionPopoverOpen(false);
                        }}
                      >
                        {i18n.translate('discover.grid.tanStack.clearSelectionButtonLabel', {
                          defaultMessage: 'Clear selection',
                        })}
                      </EuiContextMenuItem>,
                    ]}
                  />
                </EuiPopover>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <div css={styles.toolbarRight}>
            {focusedCell && (
              <EuiBadge color="hollow">
                R{focusedCell.row + 1}:C{focusedCell.col + 1}
              </EuiBadge>
            )}
            <div css={styles.toolbarControlButton}>
              <EuiPopover
                css={styles.toolbarPopover}
                aria-label={i18n.translate('discover.grid.tanStack.columnsPopoverAriaLabel', {
                  defaultMessage: 'Visible columns',
                })}
                button={
                  <EuiDataGridToolbarControl
                    css={styles.toolbarTextControl}
                    iconType="table"
                    badgeContent={dataColumns.length}
                    onClick={() => setIsColumnsPopoverOpen((isOpen) => !isOpen)}
                    data-test-subj="dataGridColumnSelectorButton"
                  >
                    {i18n.translate('discover.grid.tanStack.columnsButtonLabel', {
                      defaultMessage: 'Columns',
                    })}
                  </EuiDataGridToolbarControl>
                }
                isOpen={isColumnsPopoverOpen}
                closePopover={() => setIsColumnsPopoverOpen(false)}
                panelPaddingSize="none"
                anchorPosition="downRight"
              >
                {showSummaryColumnToggle && (
                  <>
                    <div css={styles.columnSelectorSummaryToggle}>
                      <EuiSwitch
                        compressed
                        label={
                          <EuiText size="xs">
                            {i18n.translate('discover.grid.tanStack.pinSummaryColumnSwitchLabel', {
                              defaultMessage: 'Pin summary',
                            })}
                          </EuiText>
                        }
                        checked={showSummaryColumn}
                        disabled={isSummaryMode}
                        onChange={(event) => onChangeShowSummaryColumn(event.target.checked)}
                        data-test-subj="columnSelectorShowSummaryColumn"
                      />
                    </div>
                    <EuiHorizontalRule margin="none" />
                  </>
                )}
                <EuiContextMenuPanel
                  items={dataColumns.map(({ id, isSummary, isTimestamp }) => (
                    <EuiContextMenuItem
                      key={id}
                      icon="check"
                      disabled={isSummary || isTimestamp}
                      onClick={() => {
                        persistVisibleColumns(
                          effectiveColumns.filter((columnId) => columnId !== id)
                        );
                        setIsColumnsPopoverOpen(false);
                      }}
                    >
                      {id === SOURCE_COLUMN_ID
                        ? i18n.translate('discover.grid.tanStack.summaryColumnLabel', {
                            defaultMessage: 'Summary',
                          })
                        : id}
                    </EuiContextMenuItem>
                  ))}
                />
              </EuiPopover>
            </div>
            <div css={styles.toolbarControlButton}>
              <EuiPopover
                css={styles.toolbarPopover}
                aria-label={i18n.translate('discover.grid.tanStack.sortFieldsPopoverAriaLabel', {
                  defaultMessage: 'Sorted fields',
                })}
                button={
                  <EuiDataGridToolbarControl
                    css={styles.toolbarTextControl}
                    iconType="sortable"
                    badgeContent={sort.length || undefined}
                    onClick={() => setIsSortPopoverOpen((isOpen) => !isOpen)}
                    data-test-subj="dataGridColumnSortingButton"
                  >
                    {i18n.translate('discover.grid.tanStack.sortFieldsButtonLabel', {
                      defaultMessage: 'Sort fields',
                    })}
                  </EuiDataGridToolbarControl>
                }
                isOpen={isSortPopoverOpen}
                closePopover={() => setIsSortPopoverOpen(false)}
                panelPaddingSize="none"
                anchorPosition="downRight"
              >
                <EuiContextMenuPanel
                  items={
                    sort.length
                      ? sort.map(([fieldName, direction]) => (
                          <EuiContextMenuItem
                            key={fieldName}
                            icon={direction === 'asc' ? 'sortUp' : 'sortDown'}
                            onClick={() => {
                              onSort?.(
                                sort.map(([id, currentDirection]) =>
                                  id === fieldName
                                    ? [id, currentDirection === 'asc' ? 'desc' : 'asc']
                                    : [id, currentDirection]
                                )
                              );
                            }}
                          >
                            {fieldName}
                          </EuiContextMenuItem>
                        ))
                      : [
                          <EuiContextMenuItem key="noSort" disabled>
                            {i18n.translate('discover.grid.tanStack.noSortFieldsLabel', {
                              defaultMessage: 'No fields are sorted',
                            })}
                          </EuiContextMenuItem>,
                        ]
                  }
                />
              </EuiPopover>
            </div>
            <div css={styles.toolbarControlGroup}>
              <div
                css={isFindOpen ? styles.toolbarSearchControl : styles.toolbarIconControlContainer}
              >
                {isFindOpen ? (
                  <FindInTableBar
                    matchesCount={findMatches.length}
                    activeIndex={findActiveIndex}
                    onSearch={handleFindSearch}
                    onNext={handleFindNext}
                    onPrev={handleFindPrev}
                    onClose={handleFindClose}
                    styles={styles}
                  />
                ) : (
                  <EuiToolTip
                    content={i18n.translate('discover.grid.tanStack.findInTableButtonLabel', {
                      defaultMessage: 'Find in table',
                    })}
                    disableScreenReaderOutput
                  >
                    <EuiButtonIcon
                      css={styles.toolbarIconControl}
                      iconType="magnify"
                      aria-label={i18n.translate('discover.grid.tanStack.findInTableButtonLabel', {
                        defaultMessage: 'Find in table',
                      })}
                      size="xs"
                      color="text"
                      onClick={() => setIsFindOpen(true)}
                      data-test-subj="startInTableSearchButton"
                    />
                  </EuiToolTip>
                )}
              </div>
              {showKeyboardShortcuts && (
                <div css={styles.toolbarIconControlContainer}>
                  <EuiPopover
                    css={styles.toolbarPopover}
                    aria-label={i18n.translate(
                      'discover.grid.tanStack.keyboardShortcutsPopoverAriaLabel',
                      { defaultMessage: 'Keyboard shortcuts' }
                    )}
                    button={
                      <EuiToolTip
                        content={i18n.translate(
                          'discover.grid.tanStack.keyboardShortcutsButtonLabel',
                          { defaultMessage: 'Keyboard shortcuts' }
                        )}
                        disableScreenReaderOutput
                      >
                        <EuiButtonIcon
                          css={styles.toolbarIconControl}
                          iconType="keyboard"
                          aria-label={i18n.translate(
                            'discover.grid.tanStack.keyboardShortcutsButtonLabel',
                            { defaultMessage: 'Keyboard shortcuts' }
                          )}
                          size="xs"
                          color="text"
                          onClick={() => setIsKeyboardShortcutsOpen((isOpen) => !isOpen)}
                          data-test-subj="dataGridKeyboardShortcutsButton"
                        />
                      </EuiToolTip>
                    }
                    isOpen={isKeyboardShortcutsOpen}
                    closePopover={() => setIsKeyboardShortcutsOpen(false)}
                    anchorPosition="downRight"
                    panelPaddingSize="s"
                  >
                    <EuiPopoverTitle>
                      {i18n.translate('discover.grid.tanStack.keyboardShortcutsTitle', {
                        defaultMessage: 'Keyboard shortcuts',
                      })}
                    </EuiPopoverTitle>
                    <EuiDescriptionList
                      compressed
                      type="column"
                      listItems={[
                        {
                          title: i18n.translate(
                            'discover.grid.tanStack.keyboardShortcutsNavigationKeys',
                            { defaultMessage: 'Arrow keys' }
                          ),
                          description: i18n.translate(
                            'discover.grid.tanStack.keyboardShortcutsNavigationDescription',
                            { defaultMessage: 'Move between cells' }
                          ),
                        },
                        {
                          title: i18n.translate(
                            'discover.grid.tanStack.keyboardShortcutsSearchKeys',
                            { defaultMessage: 'Ctrl/Command + F' }
                          ),
                          description: i18n.translate(
                            'discover.grid.tanStack.keyboardShortcutsSearchDescription',
                            { defaultMessage: 'Find in the table' }
                          ),
                        },
                        {
                          title: i18n.translate(
                            'discover.grid.tanStack.keyboardShortcutsCloseKey',
                            { defaultMessage: 'Escape' }
                          ),
                          description: i18n.translate(
                            'discover.grid.tanStack.keyboardShortcutsCloseDescription',
                            { defaultMessage: 'Close an open cell popover' }
                          ),
                        },
                      ]}
                    />
                  </EuiPopover>
                </div>
              )}
              <div css={styles.toolbarIconControlContainer}>
                <EuiPopover
                  css={styles.toolbarPopover}
                  aria-label={i18n.translate('discover.grid.tanStack.gridDensityPopoverAriaLabel', {
                    defaultMessage: 'Display options',
                  })}
                  button={
                    <EuiToolTip
                      content={i18n.translate('discover.grid.tanStack.gridDensityButtonLabel', {
                        defaultMessage: 'Display options',
                      })}
                      disableScreenReaderOutput
                    >
                      <EuiButtonIcon
                        css={styles.toolbarIconControl}
                        iconType="controls"
                        aria-label={i18n.translate(
                          'discover.grid.tanStack.gridDensityButtonLabel',
                          { defaultMessage: 'Display options' }
                        )}
                        size="xs"
                        color="text"
                        onClick={() => setIsDensityPopoverOpen((v) => !v)}
                        data-test-subj="dataGridDensityButton"
                      />
                    </EuiToolTip>
                  }
                  isOpen={isDensityPopoverOpen}
                  closePopover={() => setIsDensityPopoverOpen(false)}
                  anchorPosition="downRight"
                  panelPaddingSize="s"
                  panelProps={{ css: logicalStyle('width', displayPopoverWidth) }}
                >
                  <UnifiedDataTableAdditionalDisplaySettings
                    rowHeight={rowHeight}
                    onChangeRowHeight={onChangeRowHeight}
                    onChangeRowHeightLines={onChangeRowHeightLines}
                    headerRowHeight={headerRowHeight}
                    onChangeHeaderRowHeight={onChangeHeaderRowHeight}
                    onChangeHeaderRowHeightLines={onChangeHeaderRowHeightLines}
                    maxAllowedSampleSize={maxAllowedSampleSize}
                    sampleSize={sampleSizeState}
                    onChangeSampleSize={onUpdateSampleSize}
                    lineCountInput={lineCountInput}
                    headerLineCountInput={headerLineCountInput}
                    densityControl={
                      <EuiButtonGroup
                        legend={i18n.translate('discover.grid.tanStack.gridDensityLegend', {
                          defaultMessage: 'Grid density',
                        })}
                        options={DENSITY_BUTTONS}
                        idSelected={dataGridDensity}
                        onChange={(id) => {
                          onChangeDataGridDensity(
                            DATA_GRID_DENSITY_STYLE_MAP[id as DataGridDensity]
                          );
                        }}
                        buttonSize="compressed"
                        isFullWidth
                        data-test-subj="dataGridDensityButtonGroup"
                      />
                    }
                    additionalContent={gridImplementationSwitch}
                  />
                </EuiPopover>
              </div>
              <div css={styles.toolbarIconControlContainer}>
                <EuiToolTip
                  content={isFullScreen ? 'Exit full screen' : 'Full screen'}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    css={styles.toolbarIconControl}
                    iconType={isFullScreen ? 'fullScreenExit' : 'fullScreen'}
                    aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
                    size="xs"
                    color="text"
                    onClick={toggleFullScreen}
                    data-test-subj="dataGridFullScreenButton"
                  />
                </EuiToolTip>
              </div>
              {toolbarTrailingControl && (
                <div css={styles.toolbarIconControlContainer}>{toolbarTrailingControl}</div>
              )}
            </div>
          </div>
        </div>

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
              onKeyDown={handleGridKeyDown}
            >
              {/* Header */}
              {headerGroupsRaw.map((headerGroup) => (
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
                    const sortDir = header.column.getIsSorted();
                    const colId = header.column.id;
                    const isDraggable =
                      !isControl && !isSelect && !isSummary && Boolean(onSetColumns);
                    const isDragging = dragState.dragging === colId;
                    const isDragOver = dragState.over === colId && dragState.dragging !== colId;
                    const dataViewField = getDataViewFieldOrCreateFromColumnMeta({
                      dataView,
                      fieldName: colId,
                      columnMeta: columnsMeta?.[colId],
                    });
                    const columnDisplayName = getColumnDisplayName(
                      colId,
                      dataViewField?.displayName,
                      settings?.columns?.[colId]?.display ??
                        (typeof header.column.columnDef.header === 'string'
                          ? header.column.columnDef.header
                          : undefined),
                      'summary'
                    );
                    const columnIndex = effectiveColumns.indexOf(colId);

                    const headerColumnStyle =
                      isSelect || isControl
                        ? {
                            width: isSelect ? SELECT_COL_WIDTH : header.column.getSize(),
                            flexShrink: 0,
                          }
                        : getColumnStyle({
                            id: colId,
                            isSummary,
                            isTimestamp: header.column.columnDef.meta?.isTimestamp,
                          });

                    if (isSelect) {
                      return (
                        <div
                          key={header.id}
                          css={styles.selectHeaderCell}
                          style={headerColumnStyle}
                          role="columnheader"
                        >
                          <EuiCheckbox
                            id="select-all"
                            checked={allSelected}
                            indeterminate={someSelected}
                            onChange={toggleSelectAll}
                            aria-label="Select all rows"
                          />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={header.id}
                        css={[
                          isControl ? styles.controlHeaderCell : styles.headerCell,
                          !isControl && !isSelect && styles.headerCellWithActions,
                          isDraggable && styles.headerCellDraggable,
                          isDragging && styles.headerCellDragging,
                          isDragOver && styles.headerCellDragOver,
                        ]}
                        style={headerColumnStyle}
                        role="columnheader"
                        tabIndex={isDraggable ? 0 : undefined}
                        draggable={isDraggable}
                        onDragStart={isDraggable ? () => handleDragStart(colId) : undefined}
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
                      >
                        {isControl &&
                          flexRender(header.column.columnDef.header, header.getContext())}
                        {!isControl && (
                          <>
                            {showColumnTokens &&
                              !isSummary &&
                              !header.column.columnDef.meta?.isTimestamp &&
                              (() => {
                                const fieldName = header.column.columnDef.meta?.fieldName;
                                if (!fieldName) return null;
                                if (columnsMeta) {
                                  const iconType = getTextBasedColumnIconType(
                                    columnsMeta[fieldName]
                                  );
                                  if (iconType && iconType !== 'unknown') {
                                    return (
                                      <FieldIcon
                                        type={iconType}
                                        css={{ marginRight: 4, flexShrink: 0 }}
                                      />
                                    );
                                  }
                                } else {
                                  const dvField = dataView.getFieldByName(fieldName);
                                  if (dvField) {
                                    return (
                                      <FieldIcon
                                        {...getFieldIconProps(dvField)}
                                        css={{ marginRight: 4, flexShrink: 0 }}
                                      />
                                    );
                                  }
                                }
                                return null;
                              })()}
                            <span
                              css={
                                isAutoHeaderRowHeight
                                  ? styles.headerCellTextAuto
                                  : styles.headerCellText
                              }
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                            </span>
                            {header.column.columnDef.meta?.isTimestamp && (
                              <EuiIconTip
                                type="clock"
                                content={i18n.translate(
                                  'discover.grid.tanStack.timeFieldIconTooltip',
                                  {
                                    defaultMessage:
                                      'This field represents the time that events occurred.',
                                  }
                                )}
                              />
                            )}
                            {sortDir && (
                              <span css={styles.sortIndicator}>
                                <EuiIcon
                                  type={sortDir === 'asc' ? 'sortUp' : 'sortDown'}
                                  size="s"
                                  aria-hidden={true}
                                />
                              </span>
                            )}
                            {!isControl && !isSelect && (
                              <TanStackColumnHeaderActions
                                columnId={colId}
                                columnDisplayName={columnDisplayName}
                                columnIndex={columnIndex}
                                visibleColumnIds={effectiveColumns}
                                dataView={dataView}
                                columnsMeta={columnsMeta}
                                settings={settings}
                                columnSizing={columnSizing}
                                isSummaryMode={isSummaryMode}
                                isSortEnabled={headerSortEnabled}
                                isPlainRecord={isPlainRecord}
                                sort={sort}
                                onSort={onSort}
                                persistVisibleColumns={persistVisibleColumns}
                                onResize={onResize}
                                timeFieldName={timeFieldName}
                                toastNotifications={toastNotifications}
                                valueToStringConverter={valueToStringConverter}
                                rowsCount={displayedRows.length}
                                editField={editField}
                                hasEditDataViewPermission={hasEditDataViewPermission}
                                headerActionsCss={styles.headerActionsButton}
                              />
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
                            onKeyDown={stopPropagation}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Virtual body */}
              <div css={styles.virtualOuter} style={{ height: rowVirtualizer.getTotalSize() }}>
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

                    const isExpanded = currentExpandedDoc?.id === record.id;
                    const isSelected = selectedRows.has(record.id);
                    const indicator = getRowIndicator?.(record, euiTheme);

                    return (
                      <VirtualRow
                        key={row.id}
                        ref={rowVirtualizer.measureElement}
                        row={row}
                        virtualRow={virtualRow}
                        isExpanded={isExpanded}
                        isSelected={isSelected}
                        indicatorColor={indicator?.color}
                        rowHeight={baseRowHeight}
                        isAutoHeight={isAutoRowHeight}
                        styles={styles}
                        focusedColIndex={
                          focusedCell?.row === virtualRow.index ? focusedCell.col : null
                        }
                        rowIndex={virtualRow.index}
                        onFilter={onFilterRef.current}
                        setPopoverState={setPopoverState}
                        findTerm={findTerm}
                        findActiveMatch={findActiveMatch}
                        getColumnStyle={getColumnStyle}
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
                <EuiProgress
                  size="xs"
                  color="accent"
                  position="absolute"
                  css={{ bottom: 0, left: 0, right: 0, top: 'auto' }}
                />
              )}
            </div>
          )}

          {canRenderDocumentView &&
            currentExpandedDoc &&
            typeof renderDocumentView === 'function' && (
              <span className="dscTable__flyout">
                {renderDocumentView(
                  currentExpandedDoc,
                  displayedRows,
                  displayedColumns,
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
            formattedValue={popoverState.formattedValue}
            anchorRect={popoverState.rect}
            onClose={closePopover}
            onFilter={onFilterRef.current}
            styles={styles}
          />
        )}
      </div>
    );
  }
);

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
  type ColumnPinningState,
  type RowData,
  type Row,
  type Cell,
  type Column,
} from '@tanstack/react-table';
import { useVirtualizer, type Virtualizer } from '@tanstack/react-virtual';
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
  EuiPanel,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiPortal,
  EuiProgress,
  EuiSwitch,
  EuiTablePagination,
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
  formatFieldValueReact,
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
  getRowsPerPageOptions,
  DEFAULT_PAGINATION_MODE,
  DEFAULT_ROWS_PER_PAGE,
  UnifiedDataTableFooter,
  type UnifiedDataTableProps,
  type SortOrder,
  type RenderDocumentViewMeta,
  type ValueToStringConverter,
  type DocMap,
  type DataGridPaginationMode,
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
  /** Same slot as UnifiedDataTable `additionalDisplaySettingsContent` (e.g. grid implementation switch). */
  additionalDisplaySettingsContent?: React.ReactNode;
  toolbarLeftSide?: React.ReactNode;
  toolbarTrailingControl?: React.ReactNode;
  showKeyboardShortcuts?: UnifiedDataTableProps['showKeyboardShortcuts'];
  showSummaryColumnToggle?: UnifiedDataTableProps['showSummaryColumnToggle'];
  enableComparisonMode?: UnifiedDataTableProps['enableComparisonMode'];
  ariaLabelledBy?: UnifiedDataTableProps['ariaLabelledBy'];
  showFullScreenButton?: UnifiedDataTableProps['showFullScreenButton'];

  isPaginationEnabled?: boolean;
  paginationMode?: DataGridPaginationMode;
  rowsPerPageState?: number;
  rowsPerPageOptions?: number[];
  onUpdateRowsPerPage?: (rowsPerPage: number) => void;
  onUpdatePageIndex?: (pageIndex: number) => void;
  totalHits?: number;
  onFetchMoreRecords?: () => void;
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

const OVERSCAN = 5;
const MAX_SUMMARY_FIELDS = 80;
const MAX_SELECTED_DOCS_FOR_COMPARE = 100;

const scrollPositionCache = new Map<string, number>();

/** Extra padding beyond cell padding when double-click auto-fitting a column (#98434). */
const AUTO_FIT_CONTENT_PADDING_PX = 5;
const AUTO_FIT_MAX_WIDTH_PX = 600;
/** Room for sort indicator + header actions in the header cell. */
const AUTO_FIT_HEADER_CHROME_PX = 48;
const AUTO_FIT_SAMPLE_ROWS = 2000;

let autoFitMeasureCanvas: HTMLCanvasElement | null = null;

const measureTextWidth = (text: string, font: string): number => {
  if (typeof document === 'undefined') {
    return text.length * 8;
  }
  if (!autoFitMeasureCanvas) {
    autoFitMeasureCanvas = document.createElement('canvas');
  }
  const context = autoFitMeasureCanvas.getContext('2d');
  if (!context) {
    return text.length * 8;
  }
  context.font = font;
  return context.measureText(text).width;
};

/**
 * Compute a content-based column width (header + sampled cell values + padding).
 * Used when double-clicking the column resize handle.
 */
const getColumnAutoFitWidth = ({
  columnId,
  headerLabel,
  rows,
  formatValue,
  fontSizePx,
  fontFamily,
  cellPaddingH,
  minWidth = MIN_COL_WIDTH,
  maxWidth = AUTO_FIT_MAX_WIDTH_PX,
}: {
  columnId: string;
  headerLabel: string;
  rows: DataTableRecord[];
  formatValue?: (value: unknown) => string;
  fontSizePx: number;
  fontFamily: string;
  cellPaddingH: number;
  minWidth?: number;
  maxWidth?: number;
}): number => {
  const bodyFont = `${fontSizePx}px ${fontFamily}`;
  const headerFont = `600 ${fontSizePx}px ${fontFamily}`;
  let maxContentPx = measureTextWidth(headerLabel, headerFont) + AUTO_FIT_HEADER_CHROME_PX;

  const sampleCount = Math.min(rows.length, AUTO_FIT_SAMPLE_ROWS);
  for (let index = 0; index < sampleCount; index++) {
    const raw = rows[index].flattened[columnId];
    const formatted = formatValue?.(raw) ?? formatCellValue(raw);
    const firstLine = formatted.split('\n')[0] ?? '';
    if (!firstLine) {
      continue;
    }
    maxContentPx = Math.max(maxContentPx, measureTextWidth(firstLine, bodyFont));
  }

  return Math.ceil(
    Math.min(
      Math.max(maxContentPx + cellPaddingH * 2 + AUTO_FIT_CONTENT_PADDING_PX, minWidth),
      maxWidth
    )
  );
};

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return '-';
  if (Array.isArray(value)) {
    return value.map((item) => formatCellValue(item)).join(', ');
  }
  return String(value);
};

/**
 * Text formatting for find/copy/title. Formats array elements individually (like
 * convertValueToString / EuiDataGrid React display) instead of JSON.stringify
 * which produces `["value"]`.
 */
const formatFieldValueForText = ({
  value,
  fieldFormats,
  dataView,
  field,
}: {
  value: unknown;
  fieldFormats: ReturnType<typeof useDiscoverServices>['fieldFormats'];
  dataView: DataView;
  field?: ReturnType<DataView['getFieldByName']>;
}): string => {
  if (value === null || value === undefined) {
    return '-';
  }

  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => {
      if (item === null || item === undefined) {
        return '-';
      }
      if (fieldFormats) {
        return formatFieldValueText({
          value: item,
          fieldFormats,
          dataView,
          field: field ?? undefined,
        });
      }
      return formatCellValue(item);
    })
    .join(', ');
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

// ── Cell Actions: filter in/out, copy (clippable), expand (always visible) ──
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
    onExpand: (cellElement: HTMLElement) => void;
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
      (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        const cellElement = e.currentTarget.closest<HTMLElement>('[role="gridcell"]');
        if (cellElement) onExpand(cellElement);
      },
      [onExpand]
    );

    return (
      <div className="tsg-cellActions" css={styles.cellActions}>
        <div css={styles.cellActionsClippable}>
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
        </div>
        <div css={styles.cellActionsExpand}>
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
      </div>
    );
  }
);

// Matches EuiDataGrid cell popover sizing inputs (cell width drives maxInlineSize).
interface CellPopoverState {
  fieldName: string;
  value: unknown;
  formattedValue: string;
  cellElement: HTMLElement;
  cellWidth: number;
}

type SetCellPopoverState = (state: CellPopoverState | null) => void;

// ── Cell Popover (ported panel — same dimensions as EuiDataGrid) ──
const CellPopover = React.memo(
  ({
    fieldName,
    value,
    formattedValue,
    cellElement,
    cellWidth,
    onClose,
    onFilter,
    styles,
  }: CellPopoverState & {
    onClose: () => void;
    onFilter?: UnifiedDataTableProps['onFilter'];
    styles: ReturnType<typeof getTanStackDataGridStyles>;
  }) => {
    const isWidePopover = fieldName === SOURCE_COLUMN_ID;
    const cellRect = cellElement.getBoundingClientRect();

    const maxInlineSize = isWidePopover
      ? Math.min(window.innerWidth * 0.75, 600)
      : Math.min(window.innerWidth * 0.75, Math.max(cellWidth, 400));
    const maxBlockSize = window.innerHeight * 0.5;

    // Prefer below the cell; flip above when there isn't enough room.
    const spaceBelow = window.innerHeight - cellRect.bottom - 8;
    const openAbove = spaceBelow < Math.min(160, maxBlockSize) && cellRect.top > spaceBelow;
    const left = Math.max(8, Math.min(cellRect.left, window.innerWidth - maxInlineSize - 8));

    useEffect(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === keys.F2 || event.key === keys.ESCAPE) {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          requestAnimationFrame(() => cellElement.focus());
        }
      };
      document.addEventListener('keydown', onKeyDown, true);
      return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [cellElement, onClose]);

    const handleCopy = useCallback(() => {
      navigator.clipboard.writeText(formattedValue);
    }, [formattedValue]);

    const handleFilterIn = useCallback(() => {
      onFilter?.(fieldName, value, '+');
      onClose();
    }, [onFilter, fieldName, value, onClose]);

    const handleFilterOut = useCallback(() => {
      onFilter?.(fieldName, value, '-');
      onClose();
    }, [onFilter, fieldName, value, onClose]);

    const handleBackdropClick = useCallback(
      (event: React.MouseEvent) => {
        const cellActions = cellElement.querySelector('.tsg-cellActions');
        if (cellActions?.contains(event.target as Node)) {
          return;
        }
        onClose();
      },
      [cellElement, onClose]
    );

    const closeLabel = i18n.translate('discover.grid.tanStack.closePopover', {
      defaultMessage: 'Close popover',
    });

    const panelStyle = useMemo(
      () => ({
        position: 'fixed' as const,
        left,
        maxInlineSize,
        maxBlockSize,
        width: 'max-content' as const,
        minWidth: Math.min(cellWidth, maxInlineSize),
        zIndex: 10000,
        ...(openAbove
          ? { bottom: window.innerHeight - cellRect.top, top: 'auto' as const }
          : { top: cellRect.bottom, bottom: 'auto' as const }),
      }),
      [left, maxInlineSize, maxBlockSize, cellWidth, openAbove, cellRect.top, cellRect.bottom]
    );

    return (
      <EuiPortal>
        <div
          css={styles.cellPopoverBackdrop}
          onClick={handleBackdropClick}
          onKeyDown={(event) => {
            if (event.key === keys.ENTER || event.key === keys.SPACE || event.key === keys.ESCAPE) {
              event.preventDefault();
              onClose();
            }
          }}
          role="button"
          tabIndex={-1}
          aria-label={closeLabel}
        />
        <EuiPanel
          paddingSize="s"
          hasShadow
          data-test-subj="euiDataGridExpansionPopover"
          className="euiDataGridRowCell__popover unifiedDataTable__cellPopover"
          css={[styles.cellPopoverPanel, isWidePopover && styles.cellPopoverPanelWide]}
          style={panelStyle}
          role="dialog"
          aria-label={i18n.translate('discover.grid.tanStack.cellPopoverAriaLabel', {
            defaultMessage: '{fieldName} value',
            values: { fieldName },
          })}
        >
          <EuiFlexGroup
            gutterSize="none"
            direction="row"
            responsive={false}
            data-test-subj="dataTableExpandCellActionPopover"
          >
            <EuiFlexItem>
              <div
                className="unifiedDataTable__cellPopoverValue eui-textBreakWord"
                css={styles.cellPopoverValue}
                data-test-subj="dataTableExpandCellActionPopoverValue"
                tabIndex={0}
              >
                {formattedValue}
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={closeLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  aria-label={closeLabel}
                  data-test-subj="docTableClosePopover"
                  iconSize="s"
                  iconType="cross"
                  size="xs"
                  onClick={onClose}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiPopoverFooter>
            <EuiFlexGroup gutterSize="s" responsive={false} wrap>
              {onFilter && (
                <>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty iconType="plusCircle" size="s" onClick={handleFilterIn}>
                      {i18n.translate('discover.grid.tanStack.filterForValueButtonLabel', {
                        defaultMessage: 'Filter for',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty iconType="minusCircle" size="s" onClick={handleFilterOut}>
                      {i18n.translate('discover.grid.tanStack.filterOutValueButtonLabel', {
                        defaultMessage: 'Filter out',
                      })}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </>
              )}
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty iconType="copy" size="s" onClick={handleCopy}>
                  {i18n.translate('discover.grid.tanStack.copyValueButtonLabel', {
                    defaultMessage: 'Copy value',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPopoverFooter>
        </EuiPanel>
      </EuiPortal>
    );
  }
);

/**
 * Owns cell-popover state so opening/closing it does not re-render the grid.
 * Parent keeps a stable setPopoverState callback that forwards into this host via ref.
 */
const CellPopoverHost = React.memo(function CellPopoverHost({
  setPopoverStateRef,
  scrollParentRef,
  onFilterRef,
  styles,
}: {
  setPopoverStateRef: React.MutableRefObject<SetCellPopoverState>;
  scrollParentRef: React.RefObject<HTMLDivElement | null>;
  onFilterRef: React.MutableRefObject<UnifiedDataTableProps['onFilter'] | undefined>;
  styles: ReturnType<typeof getTanStackDataGridStyles>;
}) {
  const [popoverState, setPopoverState] = useState<CellPopoverState | null>(null);
  const closePopover = useCallback(() => setPopoverState(null), []);

  setPopoverStateRef.current = setPopoverState;

  useEffect(() => {
    if (!popoverState) return;
    const scrollEl = scrollParentRef.current;
    if (!scrollEl) return;
    const onScroll = () => setPopoverState(null);
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, [popoverState, scrollParentRef]);

  if (!popoverState) {
    return null;
  }

  return (
    <CellPopover
      fieldName={popoverState.fieldName}
      value={popoverState.value}
      formattedValue={popoverState.formattedValue}
      cellElement={popoverState.cellElement}
      cellWidth={popoverState.cellWidth}
      onClose={closePopover}
      onFilter={onFilterRef.current}
      styles={styles}
    />
  );
});

const CONTROL_COLUMN_IDS = [SELECT_COLUMN_ID, EXPAND_COLUMN_ID] as const;

const getColumnPinningStyle = (
  column: Column<DataTableRecord, unknown>,
  { isHeader }: { isHeader?: boolean } = {}
): React.CSSProperties => {
  const pinned = column.getIsPinned();
  if (!pinned) {
    return {};
  }

  return {
    position: 'sticky',
    left: pinned === 'left' ? column.getStart('left') : undefined,
    right: pinned === 'right' ? column.getAfter('right') : undefined,
    zIndex: isHeader ? 3 : 1,
    width: column.getSize(),
    flex: '0 0 auto',
    flexShrink: 0,
  };
};

// ── Memoized virtual row ──
const VirtualRow = React.memo(
  React.forwardRef<
    HTMLDivElement,
    {
      row: Row<DataTableRecord>;
      rowIndex: number;
      isExpanded: boolean;
      isSelected: boolean;
      indicatorColor: string | undefined;
      rowHeight: number;
      isAutoHeight: boolean;
      styles: ReturnType<typeof getTanStackDataGridStyles>;
      focusedColIndex: number | null;
      onFilter?: UnifiedDataTableProps['onFilter'];
      setPopoverState?: (state: CellPopoverState | null) => void;
      findTerm?: string;
      /** Column id of the active find match when it is in this row. */
      findActiveColumnId?: string;
      getColumnStyle: TanStackColumnLayout['getColumnStyle'];
    }
  >(function VirtualRow(
    {
      row,
      rowIndex,
      isExpanded,
      isSelected,
      indicatorColor,
      rowHeight,
      isAutoHeight,
      styles,
      focusedColIndex,
      onFilter,
      setPopoverState,
      findTerm,
      findActiveColumnId,
      getColumnStyle,
    },
    ref
  ) {
    const cells = row.getVisibleCells();
    return (
      <div
        ref={ref}
        data-index={rowIndex}
        css={[
          styles.row,
          isAutoHeight && styles.rowAutoHeight,
          isExpanded && styles.rowExpanded,
          isSelected && styles.selectedRow,
        ]}
        style={{
          height: isAutoHeight ? undefined : rowHeight,
          borderLeft: indicatorColor ? `3px solid ${indicatorColor}` : undefined,
        }}
        role="row"
        aria-rowindex={rowIndex + 2}
        aria-selected={isSelected}
        tabIndex={-1}
      >
        {cells.map((cell, colIdx) => {
          const meta = cell.column.columnDef.meta;
          return (
            <VirtualCell
              key={cell.id}
              cell={cell}
              styles={styles}
              isFocused={focusedColIndex === colIdx}
              isAutoHeight={isAutoHeight}
              onFilter={onFilter}
              setPopoverState={setPopoverState}
              findTerm={findTerm}
              isActiveMatch={findActiveColumnId === cell.column.id}
              getColumnStyle={getColumnStyle}
              isRowSelected={Boolean(meta?.isSelect) && isSelected}
              isRowExpanded={Boolean(meta?.isControl) && isExpanded}
            />
          );
        })}
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
    isActiveMatch,
    getColumnStyle,
    isRowSelected,
  }: {
    cell: Cell<DataTableRecord, unknown>;
    styles: ReturnType<typeof getTanStackDataGridStyles>;
    isFocused: boolean;
    isAutoHeight?: boolean;
    onFilter?: UnifiedDataTableProps['onFilter'];
    setPopoverState?: (state: CellPopoverState | null) => void;
    findTerm?: string;
    isActiveMatch: boolean;
    getColumnStyle: TanStackColumnLayout['getColumnStyle'];
    isRowSelected: boolean;
    /** Only used to re-render the control cell, whose content reads the expanded doc from a ref. */
    isRowExpanded: boolean;
  }) => {
    // Cell actions are only mounted while the cell is hovered or focused to keep the DOM small.
    const [isHovered, setIsHovered] = useState(false);
    const [hasFocusWithin, setHasFocusWithin] = useState(false);
    const { meta } = cell.column.columnDef;
    const isControl = meta?.isControl;
    const isSelect = meta?.isSelect;
    const isSummary = meta?.isSummary;
    const pinned = cell.column.getIsPinned();
    const isPinned = Boolean(pinned);
    const isLastLeftPinned = pinned === 'left' && cell.column.getIsLastColumn('left');
    const pinStyle = getColumnPinningStyle(cell.column);

    if (isControl || isSelect) {
      return (
        <div
          className={isPinned ? 'tsg-pinnedCell' : undefined}
          css={[
            isSelect ? styles.selectCell : styles.controlCell,
            isPinned && styles.pinnedCell,
            isLastLeftPinned && styles.pinnedCellShadow,
            isFocused && styles.focusedCell,
          ]}
          style={{
            width: isSelect ? SELECT_COL_WIDTH : cell.column.getSize(),
            flexShrink: 0,
            ...pinStyle,
          }}
          role="gridcell"
          aria-selected={isSelect ? isRowSelected : undefined}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </div>
      );
    }

    const columnStyle = {
      ...getColumnStyle({
        id: cell.column.id,
        isSummary,
        isTimestamp: meta?.isTimestamp,
      }),
      ...pinStyle,
    };

    if (isSummary) {
      const openSummaryPopover = (cellEl: HTMLElement) => {
        if (setPopoverState) {
          const summaryText = Object.entries(cell.row.original.flattened)
            .map(([k, v]) => `${k}: ${formatCellValue(v)}`)
            .join('\n');
          setPopoverState({
            fieldName: SOURCE_COLUMN_ID,
            value: summaryText,
            formattedValue: summaryText,
            cellElement: cellEl,
            cellWidth: cellEl.offsetWidth,
          });
        }
      };

      return (
        <div
          className={isPinned ? 'tsg-pinnedCell' : undefined}
          css={[
            styles.summaryCell,
            styles.expandableCell,
            isPinned && styles.pinnedCell,
            isLastLeftPinned && styles.pinnedCellShadow,
            isFocused && styles.focusedCell,
          ]}
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

    const fieldName = meta?.fieldName;
    const value = cell.getValue();
    const showActions = Boolean(fieldName) && (isHovered || hasFocusWithin);
    const getFormattedValue = () => meta?.formatValue?.(value) ?? formatCellValue(value);
    // Text formatting is only needed for highlighting and actions; skip it for idle cells.
    const formatted = findTerm || showActions ? getFormattedValue() : undefined;

    const openCellPopover = (cellEl: HTMLElement) => {
      if (fieldName && setPopoverState) {
        setPopoverState({
          fieldName,
          value,
          formattedValue: formatted ?? getFormattedValue(),
          cellElement: cellEl,
          cellWidth: cellEl.offsetWidth,
        });
      }
    };

    return (
      <div
        className={isPinned ? 'tsg-pinnedCell' : undefined}
        css={[
          styles.cell,
          styles.cellWithActions,
          styles.expandableCell,
          isPinned && styles.pinnedCell,
          isLastLeftPinned && styles.pinnedCellShadow,
          isFocused && styles.focusedCell,
        ]}
        style={columnStyle}
        role="gridcell"
        tabIndex={0}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setHasFocusWithin(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setHasFocusWithin(false);
          }
        }}
        onClick={(e) => openCellPopover(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === keys.ENTER || e.key === keys.SPACE) {
            e.preventDefault();
            openCellPopover(e.currentTarget);
          }
        }}
      >
        <div
          css={[
            isAutoHeight ? styles.cellContentAuto : styles.cellContent,
            meta?.isTimestamp && styles.timestampCell,
          ]}
        >
          {findTerm && formatted !== undefined ? (
            <HighlightedText
              text={formatted}
              term={findTerm}
              isActive={isActiveMatch}
              styles={styles}
            />
          ) : (
            flexRender(cell.column.columnDef.cell, cell.getContext())
          )}
        </div>
        {showActions && fieldName && formatted !== undefined && (
          <CellActions
            fieldName={fieldName}
            value={value}
            formattedValue={formatted}
            onFilter={onFilter}
            onExpand={openCellPopover}
            styles={styles}
          />
        )}
      </div>
    );
  }
);

// ── Leading control cell: expand toggle + profile-provided row controls ──
const RowControlsCell = React.memo(function RowControlsCell({
  record,
  rowIndex,
  isExpanded,
  rowAdditionalLeadingControls,
  onToggleExpand,
}: {
  record: DataTableRecord;
  rowIndex: number;
  isExpanded: boolean;
  rowAdditionalLeadingControls: UnifiedDataTableProps['rowAdditionalLeadingControls'];
  onToggleExpand: (record: DataTableRecord) => void;
}) {
  const rowProps = useMemo(() => ({ record, rowIndex }), [record, rowIndex]);

  // Stable per row so controls are not remounted on every render.
  const Control = useMemo<React.FC<RowControlProps>>(
    () =>
      function RowControl({
        color,
        'data-test-subj': dataTestSubj,
        disabled,
        iconType,
        label,
        onClick,
        tooltipContent,
        ...controlProps
      }) {
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

        return tooltipContent ? <EuiToolTip content={tooltipContent}>{button}</EuiToolTip> : button;
      },
    [rowProps]
  );

  const availableControls =
    rowAdditionalLeadingControls?.filter((control) => control.isAvailable?.(rowProps) ?? true) ??
    [];

  return (
    <>
      <EuiToolTip content="Toggle document details" disableScreenReaderOutput>
        <EuiButtonIcon
          size="xs"
          iconSize="s"
          aria-label="Toggle document details"
          data-test-subj="docTableExpandToggleColumn"
          onClick={() => onToggleExpand(record)}
          color={isExpanded ? 'primary' : 'text'}
          iconType={isExpanded ? 'minimize' : 'maximize'}
          isSelected={isExpanded}
        />
      </EuiToolTip>
      {availableControls.map((control) => (
        <React.Fragment key={control.id}>{control.render(Control, rowProps)}</React.Fragment>
      ))}
    </>
  );
});

type RowVirtualizer = Virtualizer<HTMLDivElement, Element>;

interface TanStackGridBodyProps {
  scrollRef: React.MutableRefObject<HTMLDivElement | null>;
  virtualizerRef: React.MutableRefObject<RowVirtualizer | null>;
  header: React.ReactNode;
  overlay: React.ReactNode;
  tableRows: Array<Row<DataTableRecord>>;
  rowHeight: number;
  isAutoRowHeight: boolean;
  scrollKey: string;
  totalWidth: number | '100%';
  styles: ReturnType<typeof getTanStackDataGridStyles>;
  selectedRows: Set<string>;
  expandedDocId: string | undefined;
  getRowIndicator?: UnifiedDataTableProps['getRowIndicator'];
  focusedCell: { row: number; col: number } | null;
  onFilter?: UnifiedDataTableProps['onFilter'];
  setPopoverState: SetCellPopoverState;
  findTerm: string;
  findActiveMatch: FindMatch | null;
  getColumnStyle: TanStackColumnLayout['getColumnStyle'];
  colCount: number;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Owns the row virtualizer so scroll-driven re-renders stay inside the grid body
 * instead of re-rendering the toolbar, header chrome, pagination, and footer.
 */
const TanStackGridBody = React.memo(function TanStackGridBody({
  scrollRef,
  virtualizerRef,
  header,
  overlay,
  tableRows,
  rowHeight,
  isAutoRowHeight,
  scrollKey,
  totalWidth,
  styles,
  selectedRows,
  expandedDocId,
  getRowIndicator,
  focusedCell,
  onFilter,
  setPopoverState,
  findTerm,
  findActiveMatch,
  getColumnStyle,
  colCount,
  onKeyDown,
}: TanStackGridBodyProps) {
  const { euiTheme } = useEuiTheme();
  const estimateSize = useCallback(() => rowHeight, [rowHeight]);
  // Must be stable: a new function invalidates the virtualizer's measurement cache every render.
  const getItemKey = useCallback(
    (index: number) => tableRows[index]?.original.id ?? index,
    [tableRows]
  );

  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: OVERSCAN,
    initialOffset: scrollPositionCache.get(scrollKey) ?? 0,
    getItemKey,
  });
  virtualizerRef.current = rowVirtualizer;

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowHeight, isAutoRowHeight, rowVirtualizer]);

  useEffect(() => {
    if (findActiveMatch) {
      rowVirtualizer.scrollToIndex(findActiveMatch.rowIndex, { align: 'center' });
    }
  }, [findActiveMatch, rowVirtualizer]);

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div
      ref={scrollRef}
      css={styles.scrollContainer}
      role="grid"
      aria-rowcount={tableRows.length + 1}
      aria-colcount={colCount}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {header}

      {/* Virtual body */}
      <div css={styles.virtualOuter} style={{ height: rowVirtualizer.getTotalSize() }}>
        <div
          css={styles.virtualInner}
          style={{
            transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
            width: totalWidth,
          }}
        >
          {virtualItems.map(({ index }) => {
            const row = tableRows[index];
            const record = row.original;

            return (
              <VirtualRow
                key={row.id}
                // Fixed-height rows never change size, so skip per-row ResizeObserver measuring.
                ref={isAutoRowHeight ? rowVirtualizer.measureElement : undefined}
                row={row}
                rowIndex={index}
                isExpanded={expandedDocId === record.id}
                isSelected={selectedRows.has(record.id)}
                indicatorColor={getRowIndicator?.(record, euiTheme)?.color}
                rowHeight={rowHeight}
                isAutoHeight={isAutoRowHeight}
                styles={styles}
                focusedColIndex={focusedCell?.row === index ? focusedCell.col : null}
                onFilter={onFilter}
                setPopoverState={setPopoverState}
                findTerm={findTerm}
                findActiveColumnId={
                  findActiveMatch?.rowIndex === index ? findActiveMatch.fieldName : undefined
                }
                getColumnStyle={getColumnStyle}
              />
            );
          })}
        </div>
      </div>

      {overlay}
    </div>
  );
});

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
    additionalDisplaySettingsContent,
    toolbarLeftSide,
    toolbarTrailingControl,
    showKeyboardShortcuts = true,
    showSummaryColumnToggle = false,
    enableComparisonMode = false,
    ariaLabelledBy = 'documentsAriaLabel',
    showFullScreenButton = true,
    isPaginationEnabled = true,
    paginationMode = DEFAULT_PAGINATION_MODE,
    rowsPerPageState,
    rowsPerPageOptions,
    onUpdateRowsPerPage,
    onUpdatePageIndex,
    totalHits,
    onFetchMoreRecords,
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

    // ── Pagination (multiPage mirrors EuiDataGrid; only shown when needed) ──
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const currentPageIndexRef = useRef(currentPageIndex);
    currentPageIndexRef.current = currentPageIndex;

    const currentPageSize = useMemo(
      () =>
        typeof rowsPerPageState === 'number' && rowsPerPageState > 0
          ? rowsPerPageState
          : DEFAULT_ROWS_PER_PAGE,
      [rowsPerPageState]
    );

    const pageSizeOptions = useMemo(
      () => rowsPerPageOptions ?? getRowsPerPageOptions(currentPageSize),
      [rowsPerPageOptions, currentPageSize]
    );

    const rowCount = displayedRows.length;
    const pageCount = useMemo(
      () => Math.max(1, Math.ceil(rowCount / currentPageSize)),
      [rowCount, currentPageSize]
    );

    const changeCurrentPageIndex = useCallback(
      (nextPageIndex: number) => {
        setCurrentPageIndex(nextPageIndex);
        onUpdatePageIndex?.(nextPageIndex);
        parentRef.current?.scrollTo({ top: 0 });
      },
      [onUpdatePageIndex]
    );

    useEffect(() => {
      const previousPageIndex = currentPageIndexRef.current;
      const calculatedPageIndex = previousPageIndex > pageCount - 1 ? 0 : previousPageIndex;
      if (calculatedPageIndex !== previousPageIndex) {
        changeCurrentPageIndex(calculatedPageIndex);
      }
    }, [pageCount, changeCurrentPageIndex]);

    useEffect(() => {
      lastSelectedRowIndexRef.current = null;
    }, [currentPageIndex]);

    const isMultiPagePagination = isPaginationEnabled && paginationMode === 'multiPage';

    /** Same rule as EUI `shouldRenderPagination`: hide when fewer rows than the smallest page size. */
    const shouldShowPagination = useMemo(() => {
      if (!isMultiPagePagination || rowCount === 0) {
        return false;
      }
      const minSizeOption = [...pageSizeOptions].sort((a, b) => a - b)[0];
      return !(rowCount < (minSizeOption || currentPageSize));
    }, [isMultiPagePagination, rowCount, pageSizeOptions, currentPageSize]);

    const pageRows = useMemo(() => {
      if (!isMultiPagePagination) {
        return displayedRows;
      }
      const start = currentPageIndex * currentPageSize;
      return displayedRows.slice(start, start + currentPageSize);
    }, [displayedRows, isMultiPagePagination, currentPageIndex, currentPageSize]);

    const allSelected = pageRows.length > 0 && pageRows.every((row) => selectedRows.has(row.id));
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
            pageRows.slice(startIndex, endIndex + 1).forEach((row) => {
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
      [pageRows]
    );

    const toggleSelectAll = useCallback(() => {
      setSelectedRows((previousSelectedRows) => {
        const nextSelectedRows = new Set(previousSelectedRows);
        if (pageRows.every((row) => nextSelectedRows.has(row.id))) {
          pageRows.forEach((row) => nextSelectedRows.delete(row.id));
        } else {
          pageRows.forEach((row) => nextSelectedRows.add(row.id));
        }
        return nextSelectedRows;
      });
    }, [pageRows]);

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

    // ── Cell popover (state lives in CellPopoverHost to avoid grid re-renders) ──
    const setPopoverStateRef = useRef<SetCellPopoverState>(() => {});
    const setPopoverState = useCallback<SetCellPopoverState>((state) => {
      setPopoverStateRef.current(state);
    }, []);

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

    // ── Column pinning (control columns stay left-pinned; data columns are toggleable) ──
    const [pinnedDataColumnIds, setPinnedDataColumnIds] = useState<string[]>([]);

    useEffect(() => {
      const visibleIds = new Set(effectiveColumns);
      setPinnedDataColumnIds((previous) => {
        const next = previous.filter((id) => visibleIds.has(id));
        return next.length === previous.length ? previous : next;
      });
    }, [effectiveColumns]);

    const columnPinning = useMemo<ColumnPinningState>(
      () => ({
        left: [...CONTROL_COLUMN_IDS, ...pinnedDataColumnIds],
      }),
      [pinnedDataColumnIds]
    );

    const handleTogglePinColumn = useCallback((columnId: string) => {
      setPinnedDataColumnIds((previous) =>
        previous.includes(columnId)
          ? previous.filter((id) => id !== columnId)
          : [...previous, columnId]
      );
    }, []);

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
    const onToggleExpandDoc = useCallback(
      (doc: DataTableRecord) => toggleExpandDocRef.current(doc),
      []
    );

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
        enablePinning: false,
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
        enablePinning: false,
        meta: { isControl: true },
        cell: function ExpandCell({ row }) {
          const record = row.original;
          return (
            <RowControlsCell
              record={record}
              rowIndex={row.index}
              isExpanded={expandedDocRef.current?.id === record.id}
              rowAdditionalLeadingControls={rowAdditionalLeadingControls}
              onToggleExpand={onToggleExpandDoc}
            />
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
          const timeField = getDataViewFieldOrCreateFromColumnMeta({
            dataView,
            fieldName: timeFieldName,
            columnMeta: columnsMeta?.[timeFieldName],
          });
          const formatTimeValue = (value: unknown) =>
            formatFieldValueForText({
              value,
              fieldFormats,
              dataView,
              field: timeField,
            });
          defs.push({
            id: timeFieldName,
            accessorFn: (r) => r.flattened[timeFieldName],
            header: timeFieldName,
            size: getTimeColumnWidth(timeFieldName, {}, settings),
            minSize: MIN_COL_WIDTH,
            enableSorting: false,
            meta: { isTimestamp: true, fieldName: timeFieldName, formatValue: formatTimeValue },
            cell: function TimeCell({ getValue, row }) {
              return formatFieldValueReact({
                value: getValue(),
                hit: row.original.raw,
                fieldFormats,
                dataView,
                field: timeField,
              });
            },
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
          const dataViewField = getDataViewFieldOrCreateFromColumnMeta({
            dataView,
            fieldName: colId,
            columnMeta: columnsMeta?.[colId],
          });
          const formatValue = (value: unknown) =>
            formatFieldValueForText({
              value,
              fieldFormats,
              dataView,
              field: dataViewField,
            });
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
              ? getTimeColumnWidth(timeFieldName, {}, settings)
              : settings?.columns?.[colId]?.width ?? DEFAULT_COL_WIDTH,
            minSize: MIN_COL_WIDTH,
            enableSorting: columnIsSortable,
            meta: { isTimestamp: isTimeField, fieldName: colId, formatValue },
            cell: function DataCell({ getValue, row }) {
              return formatFieldValueReact({
                value: getValue(),
                hit: row.original.raw,
                fieldFormats,
                dataView,
                field: dataViewField,
              });
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
      isPlainRecord,
      timeFieldName,
      rowAdditionalLeadingControls,
      headerRowHeightLines,
      actionsColumnWidth,
      onToggleExpandDoc,
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
      data: pageRows,
      columns: tanstackColumns,
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: isSortEnabled && !isSummaryMode ? getSortedRowModel() : undefined,
      state: { sorting: sortingState, columnSizing, columnPinning },
      onSortingChange: handleSortingChange,
      onColumnSizingChange: handleColumnSizingChange,
      columnResizeMode: 'onChange',
      enableColumnResizing: true,
      enableColumnPinning: true,
      enableSorting: isSortEnabled && !isSummaryMode,
      enableMultiSort: true,
      manualSorting: false,
    });

    const handleAutoFitColumn = useCallback(
      (columnId: string) => {
        const column = table.getColumn(columnId);
        if (
          !column ||
          column.columnDef.meta?.isControl ||
          column.columnDef.meta?.isSelect ||
          column.columnDef.meta?.isSummary
        ) {
          return;
        }

        const dataViewField = getDataViewFieldOrCreateFromColumnMeta({
          dataView,
          fieldName: columnId,
          columnMeta: columnsMeta?.[columnId],
        });
        const headerLabel = getColumnDisplayName(
          columnId,
          dataViewField?.displayName,
          settings?.columns?.[columnId]?.display ??
            (typeof column.columnDef.header === 'string' ? column.columnDef.header : undefined),
          'summary'
        );

        const nextWidth = getColumnAutoFitWidth({
          columnId,
          headerLabel,
          rows: displayedRows,
          formatValue: column.columnDef.meta?.formatValue,
          fontSizePx: densityCfg.fontSize,
          fontFamily: euiTheme.font.family,
          cellPaddingH: densityCfg.cellPadding,
          minWidth: column.columnDef.minSize ?? MIN_COL_WIDTH,
          maxWidth: Math.min(AUTO_FIT_MAX_WIDTH_PX, Math.floor(window.innerWidth * 0.75)),
        });

        setColumnSizing((previous) => ({ ...previous, [columnId]: nextWidth }));
        onResizeRef.current?.({ columnId, width: nextWidth });
      },
      [
        table,
        displayedRows,
        dataView,
        columnsMeta,
        settings?.columns,
        densityCfg.fontSize,
        densityCfg.cellPadding,
        euiTheme.font.family,
      ]
    );

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

    // Filled by TanStackGridBody, which owns the virtualizer.
    const virtualizerRef = useRef<RowVirtualizer | null>(null);

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
        virtualizerRef.current?.scrollToIndex(r, { align: 'auto' });
      },
      [tableRows.length, totalColCount]
    );

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
                        data-test-subj="dataGridDisplaySelectorButton"
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
                    additionalContent={additionalDisplaySettingsContent}
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
            <TanStackGridBody
              scrollRef={parentRef}
              virtualizerRef={virtualizerRef}
              tableRows={tableRows}
              rowHeight={baseRowHeight}
              isAutoRowHeight={isAutoRowHeight}
              scrollKey={scrollKey}
              totalWidth={totalWidth}
              styles={styles}
              selectedRows={selectedRows}
              expandedDocId={currentExpandedDoc?.id}
              getRowIndicator={getRowIndicator}
              focusedCell={focusedCell}
              onFilter={onFilterRef.current}
              setPopoverState={setPopoverState}
              findTerm={findTerm}
              findActiveMatch={findActiveMatch}
              getColumnStyle={getColumnStyle}
              colCount={totalColCount}
              onKeyDown={handleGridKeyDown}
              header={headerGroupsRaw.map((headerGroup) => (
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
                            ...getColumnPinningStyle(header.column, { isHeader: true }),
                          }
                        : {
                            ...getColumnStyle({
                              id: colId,
                              isSummary,
                              isTimestamp: header.column.columnDef.meta?.isTimestamp,
                            }),
                            ...getColumnPinningStyle(header.column, { isHeader: true }),
                          };
                    const isPinnedHeader = Boolean(header.column.getIsPinned());
                    const isLastLeftPinnedHeader =
                      header.column.getIsPinned() === 'left' &&
                      header.column.getIsLastColumn('left');

                    if (isSelect) {
                      return (
                        <div
                          key={header.id}
                          className={isPinnedHeader ? 'tsg-pinnedHeaderCell' : undefined}
                          css={[
                            styles.selectHeaderCell,
                            isPinnedHeader && styles.pinnedHeaderCell,
                            isLastLeftPinnedHeader && styles.pinnedCellShadow,
                          ]}
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
                        className={isPinnedHeader ? 'tsg-pinnedHeaderCell' : undefined}
                        css={[
                          isControl ? styles.controlHeaderCell : styles.headerCell,
                          !isControl && !isSelect && styles.headerCellWithActions,
                          isPinnedHeader && styles.pinnedHeaderCell,
                          isLastLeftPinnedHeader && styles.pinnedCellShadow,
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
                                onAutoFitColumn={handleAutoFitColumn}
                                onTogglePinColumn={!isSummary ? handleTogglePinColumn : undefined}
                                isColumnPinned={pinnedDataColumnIds.includes(colId)}
                                timeFieldName={timeFieldName}
                                toastNotifications={toastNotifications}
                                valueToStringConverter={valueToStringConverter}
                                rowsCount={displayedRows.length}
                                editField={editField}
                                hasEditDataViewPermission={hasEditDataViewPermission}
                                headerActionsCss={styles.headerActionsButton}
                                headerActionsWrapperCss={styles.headerActions}
                                headerActionsVisibleCss={styles.headerActionsVisible}
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
              overlay={
                <>
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
                </>
              }
            />
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

        {shouldShowPagination && (
          <div css={styles.pagination} data-test-subj="tanStackDataGridPagination">
            <EuiTablePagination
              aria-controls={dataGridId}
              activePage={currentPageIndex}
              itemsPerPage={currentPageSize}
              itemsPerPageOptions={pageSizeOptions}
              showPerPageOptions={pageSizeOptions.length > 0}
              pageCount={pageCount}
              onChangePage={changeCurrentPageIndex}
              onChangeItemsPerPage={(nextPageSize) => {
                onUpdateRowsPerPage?.(nextPageSize);
                changeCurrentPageIndex(0);
              }}
              aria-label={i18n.translate('discover.grid.tanStack.paginationAriaLabel', {
                defaultMessage: 'Pagination for documents table',
              })}
            />
          </div>
        )}

        {loadingState !== DataLoadingState.loading &&
          isPaginationEnabled &&
          !isFilterActive &&
          !isCompareActive && (
            <UnifiedDataTableFooter
              isLoadingMore={isLoadingMore}
              rowCount={rowCount}
              sampleSize={sampleSizeState}
              pageCount={pageCount}
              pageIndex={isMultiPagePagination ? currentPageIndex : 0}
              totalHits={totalHits}
              onFetchMoreRecords={onFetchMoreRecords}
              data={data}
              fieldFormats={fieldFormats}
              paginationMode={paginationMode}
              hasScrolledToBottom={true}
            />
          )}

        {/* Cell popover — isolated so open/close does not re-render the grid */}
        <CellPopoverHost
          setPopoverStateRef={setPopoverStateRef}
          scrollParentRef={parentRef}
          onFilterRef={onFilterRef}
          styles={styles}
        />
      </div>
    );
  }
);

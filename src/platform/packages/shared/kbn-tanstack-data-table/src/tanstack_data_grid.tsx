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
} from '@tanstack/react-table';
import {
  EuiBadge,
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
  EuiTablePagination,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  euiFontSize,
  keys,
  logicalStyle,
  mathWithUnits,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiDataGridRefProps } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord, RowControlProps } from '@kbn/discover-utils';
import {
  getShouldShowFieldHandler,
  calcFieldCounts,
  formatFieldValueReact,
  formatFieldValueText,
  formatHitReact,
  canPrependTimeFieldColumn,
  getDataViewFieldFromDataSource,
  getVisibleColumns,
  prepareDataViewForEditing,
} from '@kbn/discover-utils';
import { FieldIcon, getFieldIconProps, getFieldIconType } from '@kbn/field-utils';
import { i18n } from '@kbn/i18n';
import {
  SourceDocument,
  SourceDocumentJsonMode,
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
  getRenderCellValueFn,
  useUnifiedDataTableRestorableState as useRestorableState,
  withUnifiedDataTableRestorableState,
  useFullScreenWatcher,
  useScrollToExpandedDoc,
  getSchemaByKbnType,
  isSortable,
  CopyAsTextFormat,
  copyRowsAsJsonToClipboard,
  copyRowsAsTextToClipboard,
  getRowsPerPageOptions,
  DEFAULT_PAGINATION_MODE,
  DEFAULT_ROWS_PER_PAGE,
  UnifiedDataTableFooter,
  type UnifiedDataTableProps,
  type SortOrder,
  type RenderDocumentViewMeta,
  type ValueToStringConverter,
  type DocMap,
  type CustomCellRenderer,
  type DataGridCellValueElementProps,
  type DataGridPaginationMode,
} from '@kbn/unified-data-table';
import { escapeRegExp, uniq } from 'lodash';
import { shouldShowFieldFilterInOutActions } from '@kbn/unified-doc-viewer/utils/should_show_field_filter_actions';
import type { Serializable } from '@kbn/utility-types';
import {
  useDataGridColumnsCellActions,
  type UseDataGridColumnsCellActionsProps,
} from '@kbn/cell-actions';
import type { AggregateQuery } from '@kbn/es-query';
import { columnToFieldBase, type DataSource } from '@kbn/data-source';
import {
  getTanStackDataGridStyles,
  CONTROL_COL_WIDTH,
  SELECT_COL_WIDTH,
  ROW_INDICATOR_COL_WIDTH,
  DEFAULT_COL_WIDTH,
  MIN_COL_WIDTH,
} from './tanstack_data_grid.styles';
import {
  computeTanStackColumnLayout,
  getTimeColumnWidth,
  type TanStackDataColumnDescriptor,
} from './tanstack_column_layout';
import { TanStackCompareDocuments } from './tanstack_compare_documents';
import {
  TanStackActionsColumnHeader,
  TanStackHeaderActionsBridge,
  TanStackHeaderCellText,
} from './tanstack_grid_header';
import {
  CellPopoverHost,
  type CellPopoverActionsByColumn,
  type SetCellPopoverState,
} from './tanstack_grid_cell_actions';
import { formatCellValue, getColumnPinningStyle } from './tanstack_grid_helpers';
import {
  TanStackGridBody,
  scrollPositionCache,
  type FindMatch,
  type RowVirtualizer,
  type UseRowVirtualizer,
  useGridBodyRowVirtualizer,
} from './tanstack_grid_body';
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    isControl?: boolean;
    isRowIndicator?: boolean;
    isSelect?: boolean;
    isSummary?: boolean;
    isTimestamp?: boolean;
    fieldName?: string;
    formatValue?: (value: unknown) => string;
    /** Whether filter in/out actions are offered, decided like UnifiedDataTable's cell actions. */
    canFilter?: boolean;
  }
}

export interface TanStackDataGridProps {
  rows: DataTableRecord[];
  columns: string[];
  dataSource?: DataSource;
  externalCustomRenderers?: UnifiedDataTableProps['externalCustomRenderers'];
  dataView: DataView;
  query?: AggregateQuery;
  showTimeCol: boolean;
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
  /** Same slot as UnifiedDataTable `additionalDisplaySettingsContent`. */
  additionalDisplaySettingsContent?: React.ReactNode;
  toolbarLeftSide?: React.ReactNode;
  toolbarTrailingControl?: React.ReactNode;
  /** Rendered below the toolbar, like the `bottomSection` of UnifiedDataTable's custom toolbar (callouts, loading indicator). */
  toolbarBottomSection?: React.ReactNode;
  hideFilteringOnComputedColumns?: UnifiedDataTableProps['hideFilteringOnComputedColumns'];
  /**
   * Virtualizes the rows, e.g. through a parent virtualizer in the cascade layout. Defaults to
   * virtualizing within the grid body. Must not change while the grid is mounted.
   */
  useRowVirtualizer?: UseRowVirtualizer;
  /** Same as UnifiedDataTable: maximum number of fields shown in the summary column. */
  maxDocFieldsDisplayed?: UnifiedDataTableProps['maxDocFieldsDisplayed'];
  /** Same as UnifiedDataTable: UI actions trigger whose compatible actions are added to the cell popover. */
  cellActionsTriggerId?: UnifiedDataTableProps['cellActionsTriggerId'];
  cellActionsMetadata?: UnifiedDataTableProps['cellActionsMetadata'];
  showKeyboardShortcuts?: UnifiedDataTableProps['showKeyboardShortcuts'];
  showMultiFields?: UnifiedDataTableProps['showMultiFields'];
  showSummaryColumnToggle?: UnifiedDataTableProps['showSummaryColumnToggle'];
  enableComparisonMode?: UnifiedDataTableProps['enableComparisonMode'];
  ariaLabelledBy?: UnifiedDataTableProps['ariaLabelledBy'];
  showFullScreenButton?: UnifiedDataTableProps['showFullScreenButton'];
  documentsDisplayModeState?: UnifiedDataTableProps['documentsDisplayModeState'];
  onUpdateDocumentsDisplayMode?: UnifiedDataTableProps['onUpdateDocumentsDisplayMode'];
  jsonModeSettingsState?: UnifiedDataTableProps['jsonModeSettingsState'];
  onUpdateJsonModeSettings?: UnifiedDataTableProps['onUpdateJsonModeSettings'];

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

const DEFAULT_MAX_DOC_FIELDS_DISPLAYED = 50;
const noop = () => {};
const MAX_SELECTED_DOCS_FOR_COMPARE = 100;

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
  fieldFormats: UnifiedDataTableProps['services']['fieldFormats'];
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
function scanMatches(
  rows: DataTableRecord[],
  columns: string[],
  term: string,
  formatValue: (fieldName: string, value: unknown) => string,
  getSummaryFieldNames: (row: DataTableRecord) => string[]
): FindMatch[] {
  const trimmedTerm = term.trim();
  if (!trimmedTerm) return [];
  const searchTermRegExp = new RegExp(escapeRegExp(trimmedTerm), 'gi');
  const matches: FindMatch[] = [];
  const countMatches = (fieldName: string, value: unknown) =>
    value === null || value === undefined
      ? 0
      : (formatValue(fieldName, value).match(searchTermRegExp) ?? []).length;

  // Like UnifiedDataTable's in-table search: every occurrence in the displayed values counts,
  // column by column, and the summary column only counts the fields it renders.
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    for (const column of columns) {
      const fieldNames = column === SOURCE_COLUMN ? getSummaryFieldNames(row) : [column];
      for (const fieldName of fieldNames) {
        const count = countMatches(fieldName, row.flattened[fieldName]);
        for (let i = 0; i < count; i++) {
          matches.push({ rowIndex: ri, fieldName: column });
        }
      }
    }
  }
  return matches;
}

const FindInTableBar = React.memo(
  ({
    initialTerm,
    matchesCount,
    activeIndex,
    onSearch,
    onNext,
    onPrev,
    onClose,
    styles,
  }: {
    /** Restored search term, e.g. when switching back to a Discover tab. */
    initialTerm: string;
    matchesCount: number;
    activeIndex: number;
    onSearch: (term: string) => void;
    onNext: () => void;
    onPrev: () => void;
    onClose: () => void;
    styles: ReturnType<typeof getTanStackDataGridStyles>;
  }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState(initialTerm);

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

// Same ids as UnifiedDataTable control columns, so tests can target either grid.
const EXPAND_COLUMN_ID = 'actions';
const SELECT_COLUMN_ID = 'select';
const ROW_INDICATOR_COLUMN_ID = 'colorIndicator';
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

// ── Cell popover content (value + filter/copy footer) ──
const CONTROL_COLUMN_IDS = [SELECT_COLUMN_ID, EXPAND_COLUMN_ID] as const;

// ── Leading row indicator cell, same DOM contract as UnifiedDataTable's color indicator ──
const RowIndicatorCell = React.memo(function RowIndicatorCell({
  record,
  getRowIndicator,
}: {
  record: DataTableRecord;
  getRowIndicator: NonNullable<UnifiedDataTableProps['getRowIndicator']>;
}) {
  const { euiTheme } = useEuiTheme();
  const indicator = getRowIndicator(record, euiTheme);
  return (
    <div
      data-test-subj="unifiedDataTableRowColorIndicatorCell"
      title={indicator?.label}
      style={{
        width: ROW_INDICATOR_COL_WIDTH,
        height: '100%',
        background: indicator?.color ?? 'transparent',
      }}
    />
  );
});

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
  // Same overflow as UnifiedDataTable: one inline control plus a menu when they don't all fit.
  const inlineSlots = getInlineRowControlSlots(rowAdditionalLeadingControls);
  const inlineControls = availableControls.slice(0, inlineSlots);
  const menuControls = availableControls.slice(inlineSlots);

  return (
    <>
      <EuiToolTip content="Toggle document details" disableScreenReaderOutput>
        <EuiButtonIcon
          size="xs"
          iconSize="s"
          aria-label="Toggle document details"
          data-test-subj={
            record.isAnchor ? 'docTableExpandToggleColumnAnchor' : 'docTableExpandToggleColumn'
          }
          onClick={() => onToggleExpand(record)}
          color={isExpanded ? 'primary' : 'text'}
          iconType={isExpanded ? 'minimize' : 'maximize'}
          isSelected={isExpanded}
        />
      </EuiToolTip>
      {inlineControls.map((control) => (
        <React.Fragment key={control.id}>{control.render(Control, rowProps)}</React.Fragment>
      ))}
      {menuControls.length > 0 && <RowControlsMenu controls={menuControls} rowProps={rowProps} />}
    </>
  );
});

const VISIBLE_ROW_LEADING_CONTROLS = 2;

/** Number of row controls shown inline, like UnifiedDataTable's additional row control columns. */
const getInlineRowControlSlots = (
  controls: UnifiedDataTableProps['rowAdditionalLeadingControls']
): number => {
  const count = controls?.length ?? 0;
  return count <= VISIBLE_ROW_LEADING_CONTROLS ? count : VISIBLE_ROW_LEADING_CONTROLS - 1;
};

const RowControlsMenu = ({
  controls,
  rowProps,
}: {
  controls: NonNullable<UnifiedDataTableProps['rowAdditionalLeadingControls']>;
  rowProps: { record: DataTableRecord; rowIndex: number };
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonLabel = i18n.translate('discover.grid.tanStack.additionalRowActions', {
    defaultMessage: 'Additional actions',
  });
  const MenuItem = useMemo<React.FC<RowControlProps>>(
    () =>
      function RowControlMenuItem({
        'data-test-subj': dataTestSubj,
        color,
        disabled,
        label,
        iconType,
        onClick,
      }) {
        return (
          <EuiContextMenuItem
            data-test-subj={dataTestSubj}
            disabled={disabled}
            icon={iconType}
            color={color}
            onClick={() => {
              onClick?.(rowProps);
              setIsOpen(false);
            }}
          >
            {label}
          </EuiContextMenuItem>
        );
      },
    [rowProps]
  );

  return (
    <EuiPopover
      aria-label={buttonLabel}
      button={
        <EuiToolTip content={buttonLabel} disableScreenReaderOutput>
          <EuiButtonIcon
            data-test-subj="unifiedDataTable_additionalRowControl_actionsMenu"
            size="xs"
            iconSize="s"
            iconType="ellipsis"
            color="text"
            aria-label={buttonLabel}
            onClick={() => setIsOpen((open) => !open)}
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiContextMenuPanel
        items={controls.map((control) => (
          <React.Fragment key={control.id}>{control.render(MenuItem, rowProps)}</React.Fragment>
        ))}
      />
    </EuiPopover>
  );
};

const SummaryCellContent = React.memo(
  ({
    row,
    dataView,
    shouldShowFieldHandler,
    fieldFormats,
    dataSource,
    isCompressed,
    maxEntries,
  }: {
    row: DataTableRecord;
    dataView: DataView;
    maxEntries: number;
    shouldShowFieldHandler: (fieldName: string) => boolean;
    fieldFormats: UnifiedDataTableProps['services']['fieldFormats'];
    dataSource: DataSource | undefined;
    isCompressed: boolean;
  }) => {
    const filteredRow = useMemo(() => filterNullFields(row), [row]);
    return (
      <SourceDocument
        useTopLevelObjectColumns={false}
        row={filteredRow}
        columnId={SOURCE_COLUMN_ID}
        dataView={dataView}
        shouldShowFieldHandler={shouldShowFieldHandler}
        maxEntries={maxEntries}
        fieldFormats={fieldFormats}
        dataSource={dataSource}
        isCompressed={isCompressed}
      />
    );
  }
);

const CustomDataCell = React.memo(
  ({
    Renderer,
    row,
    rowIndex,
    columnId,
    colIndex,
    dataView,
    fieldFormats,
    dataSource,
    isCompressed,
  }: {
    Renderer: CustomCellRenderer[string];
    row: DataTableRecord;
    rowIndex: number;
    columnId: string;
    colIndex: number;
    dataView: DataView;
    fieldFormats: DataGridCellValueElementProps['fieldFormats'];
    dataSource: DataSource | undefined;
    isCompressed: boolean;
  }) => {
    const [cellProps, setCellProps] = useState<
      Parameters<DataGridCellValueElementProps['setCellProps']>[0]
    >({});

    return (
      <span {...cellProps}>
        <Renderer
          row={row}
          rowIndex={rowIndex}
          columnId={columnId}
          colIndex={colIndex}
          dataView={dataView}
          fieldFormats={fieldFormats}
          dataSource={dataSource}
          isCompressed={isCompressed}
          isDetails={false}
          isExpandable={false}
          isExpanded={false}
          closePopover={() => {}}
          setCellProps={setCellProps}
        />
      </span>
    );
  }
);

// Memoized by `withUnifiedDataTableRestorableState`, which only forwards refs to non-function components.
const TanStackDataGridComponent: React.FC<TanStackDataGridProps> = ({
  rows,
  columns,
  dataSource,
  externalCustomRenderers,
  dataView,
  query,
  showTimeCol,
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
  toolbarBottomSection,
  hideFilteringOnComputedColumns,
  useRowVirtualizer = useGridBodyRowVirtualizer,
  maxDocFieldsDisplayed = DEFAULT_MAX_DOC_FIELDS_DISPLAYED,
  cellActionsTriggerId,
  cellActionsMetadata,
  showKeyboardShortcuts = true,
  showMultiFields = true,
  showSummaryColumnToggle = false,
  enableComparisonMode = false,
  ariaLabelledBy = 'documentsAriaLabel',
  showFullScreenButton = true,
  documentsDisplayModeState,
  onUpdateDocumentsDisplayMode,
  jsonModeSettingsState,
  onUpdateJsonModeSettings,
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
  // Same full screen handling as UnifiedDataTable: resets z-indexes on the page while full screen.
  const { dataGridId, dataGridWrapper, setDataGridWrapper } = useFullScreenWatcher();
  const styles = useMemo(() => getTanStackDataGridStyles(euiTheme), [euiTheme]);

  const scrollKey = dataView.id ?? dataView.title;
  const timeFieldName = dataView.timeFieldName;
  const isPlainRecord = dataSource?.kind === 'esql';

  // ── Find in table ──
  const [inTableSearch, setInTableSearch] = useRestorableState('inTableSearch', undefined);
  const [isFindOpen, setIsFindOpen] = useState(Boolean(inTableSearch?.searchTerm));
  const findTerm = inTableSearch?.searchTerm ?? '';
  const findActiveIndex = Math.max((inTableSearch?.activeMatch?.matchPosition ?? 1) - 1, 0);
  const setFindTerm = useCallback(
    (searchTerm: string) =>
      setInTableSearch((previous) =>
        searchTerm ? { ...previous, searchTerm, activeMatch: undefined } : undefined
      ),
    [setInTableSearch]
  );
  const setFindActiveIndex = useCallback(
    (next: number | ((previous: number) => number)) =>
      setInTableSearch((previous) => {
        if (!previous?.searchTerm) return previous;
        const previousIndex = Math.max((previous.activeMatch?.matchPosition ?? 1) - 1, 0);
        const nextIndex = typeof next === 'function' ? next(previousIndex) : next;
        return {
          ...previous,
          activeMatch: {
            rowIndex: 0,
            columnId: '',
            matchIndexWithinCell: 0,
            matchPosition: nextIndex + 1,
          },
        };
      }),
    [setInTableSearch]
  );

  const documentsDisplayMode = documentsDisplayModeState ?? 'table';
  const displayedColumns = useMemo(
    () => getDisplayedColumns(columns, dataView, documentsDisplayMode),
    [columns, dataView, documentsDisplayMode]
  );

  const shouldPrependTimeFieldColumn = useMemo(
    () => canPrependTimeFieldColumn(displayedColumns, timeFieldName, dataSource, showTimeCol),
    [dataSource, displayedColumns, showTimeCol, timeFieldName]
  );

  const isJsonMode = documentsDisplayMode === 'json';
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
        dataSource,
        showTimeCol
      );

      onSetColumns?.(nextColumns, !shouldPrependTime);
    },
    [dataSource, effectiveColumns, onSetColumns, showTimeCol, timeFieldName]
  );

  // ── Row selection ──
  const [selectedDocsMap, setSelectedDocsMap] = useRestorableState('selectedDocsMap', {});
  const selectedRows = useMemo(
    () => new Set(Object.keys(selectedDocsMap).filter((id) => selectedDocsMap[id])),
    [selectedDocsMap]
  );
  const setSelectedRows = useCallback(
    (next: Set<string> | ((previous: Set<string>) => Set<string>)) =>
      setSelectedDocsMap((previousMap) => {
        const nextSet =
          typeof next === 'function'
            ? next(new Set(Object.keys(previousMap).filter((id) => previousMap[id])))
            : next;
        return Object.fromEntries(Array.from(nextSet, (id) => [id, true]));
      }),
    [setSelectedDocsMap]
  );
  const [isFilterActive, setIsFilterActive] = useRestorableState('isFilterActive', false);
  const [isCompareActive, setIsCompareActive] = useRestorableState('isCompareActive', false);
  const lastSelectedRowIndexRef = useRef<number | null>(null);
  const availableRowIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);
  const displayedRows = useMemo(
    () => (isFilterActive ? rows.filter((row) => selectedRows.has(row.id)) : rows),
    [isFilterActive, rows, selectedRows]
  );

  // ── Pagination (multiPage mirrors EuiDataGrid; only shown when needed) ──
  const [currentPageIndex, setCurrentPageIndex] = useRestorableState('pageIndex', 0);
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
    [onUpdatePageIndex, setCurrentPageIndex]
  );

  useEffect(() => {
    const previousPageIndex = currentPageIndexRef.current;
    const calculatedPageIndex = previousPageIndex > pageCount - 1 ? 0 : previousPageIndex;
    if (calculatedPageIndex !== previousPageIndex) {
      changeCurrentPageIndex(calculatedPageIndex);
    }
  }, [pageCount, changeCurrentPageIndex]);

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
  const someSelected = !allSelected && pageRows.some((row) => selectedRows.has(row.id));
  const selectAllOnPageLabel =
    allSelected || someSelected
      ? i18n.translate('discover.grid.tanStack.deselectAllRowsOnPageLabel', {
          defaultMessage: 'Deselect all visible rows',
        })
      : i18n.translate('discover.grid.tanStack.selectAllRowsOnPageLabel', {
          defaultMessage: 'Select all visible rows',
        });
  // Same as UnifiedDataTable: suggest selecting all rows once a full page is selected.
  const shouldSuggestToSelectAll =
    isMultiPagePagination &&
    !isFilterActive &&
    rows.length > 1 &&
    selectedRows.size < rows.length &&
    selectedRows.size >= currentPageSize;

  const toggleSelectRow = useCallback(
    (rowId: string, _pageRowIndex: number, selectRange: boolean) => {
      // Ranges use absolute indexes so they can span pages, like UnifiedDataTable.
      const rowIndex = displayedRows.findIndex((row) => row.id === rowId);
      // Read the anchor now: the updater may run after the ref is updated below.
      const previousRowIndex = lastSelectedRowIndexRef.current;
      setSelectedRows((previousSelectedRows) => {
        const nextSelectedRows = new Set(previousSelectedRows);
        const shouldSelect = !nextSelectedRows.has(rowId);

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
    [displayedRows, setSelectedRows]
  );

  const selectAllRows = useCallback(() => {
    setSelectedRows(new Set(rows.map((row) => row.id)));
  }, [rows, setSelectedRows]);

  const toggleSelectAll = useCallback(() => {
    setSelectedRows((previousSelectedRows) => {
      const nextSelectedRows = new Set(previousSelectedRows);
      // A partially or fully selected page is cleared, like UnifiedDataTable.
      if (pageRows.some((row) => nextSelectedRows.has(row.id))) {
        pageRows.forEach((row) => nextSelectedRows.delete(row.id));
      } else {
        pageRows.forEach((row) => nextSelectedRows.add(row.id));
      }
      return nextSelectedRows;
    });
  }, [pageRows, setSelectedRows]);

  const clearSelection = useCallback(() => {
    setSelectedRows(new Set());
    setIsFilterActive(false);
    lastSelectedRowIndexRef.current = null;
  }, [setIsFilterActive, setSelectedRows]);

  useEffect(() => {
    setSelectedRows((previousSelectedRows) => {
      const nextSelectedRows = new Set(
        Array.from(previousSelectedRows).filter((rowId) => availableRowIds.has(rowId))
      );
      return nextSelectedRows.size === previousSelectedRows.size
        ? previousSelectedRows
        : nextSelectedRows;
    });
  }, [availableRowIds, setSelectedRows]);

  useEffect(() => {
    if (selectedRows.size === 0) {
      setIsFilterActive(false);
      setIsCompareActive(false);
    }
  }, [selectedRows.size, setIsCompareActive, setIsFilterActive]);

  const selectedRowsRef = useRef(selectedRows);
  selectedRowsRef.current = selectedRows;

  const toggleSelectRowRef = useRef(toggleSelectRow);
  toggleSelectRowRef.current = toggleSelectRow;

  // Find matches
  // Match the formatted values the grid displays, like UnifiedDataTable's in-table search.
  const formatFindValue = useCallback(
    (fieldName: string, value: unknown) =>
      formatFieldValueForText({
        value,
        fieldFormats,
        dataView,
        field: getDataViewFieldFromDataSource({ dataView, dataSource, fieldName }),
      }),
    [dataSource, dataView, fieldFormats]
  );
  const shouldShowFieldHandler = useMemo(() => {
    const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
    return getShouldShowFieldHandler(dataViewFields, dataView, showMultiFields);
  }, [dataView, showMultiFields]);

  const getSummaryFieldNames = useCallback(
    (row: DataTableRecord) =>
      formatHitReact(
        filterNullFields(row),
        dataView,
        shouldShowFieldHandler,
        maxDocFieldsDisplayed,
        fieldFormats,
        dataSource
      ).flatMap(([, , fieldName]) => (fieldName ? [fieldName] : [])),
    [dataSource, dataView, fieldFormats, maxDocFieldsDisplayed, shouldShowFieldHandler]
  );
  const findMatches = useMemo(
    () =>
      scanMatches(displayedRows, effectiveColumns, findTerm, formatFindValue, getSummaryFieldNames),
    [displayedRows, effectiveColumns, findTerm, formatFindValue, getSummaryFieldNames]
  );
  const findActiveMatch = findMatches[findActiveIndex] ?? null;
  const findActivePageIndex =
    findActiveMatch && isMultiPagePagination
      ? Math.floor(findActiveMatch.rowIndex / currentPageSize)
      : null;
  // Like UnifiedDataTable, go to the page of the active match.
  useEffect(() => {
    if (findActivePageIndex !== null) {
      setCurrentPageIndex(findActivePageIndex);
    }
  }, [findActivePageIndex, setCurrentPageIndex]);
  // The grid body works with indexes relative to the current page.
  const pageFindActiveMatch = useMemo(
    () =>
      findActiveMatch && findActivePageIndex !== null
        ? {
            ...findActiveMatch,
            rowIndex: findActiveMatch.rowIndex - findActivePageIndex * currentPageSize,
          }
        : findActiveMatch,
    [currentPageSize, findActiveMatch, findActivePageIndex]
  );

  const handleFindSearch = useCallback(
    (term: string) => {
      setFindTerm(term);
      setFindActiveIndex(0);
    },
    [setFindActiveIndex, setFindTerm]
  );
  const handleFindNext = useCallback(() => {
    setFindActiveIndex((prev) => (findMatches.length === 0 ? 0 : (prev + 1) % findMatches.length));
  }, [findMatches.length, setFindActiveIndex]);
  const handleFindPrev = useCallback(() => {
    setFindActiveIndex((prev) =>
      findMatches.length === 0 ? 0 : (prev - 1 + findMatches.length) % findMatches.length
    );
  }, [findMatches.length, setFindActiveIndex]);
  const handleFindClose = useCallback(() => {
    setIsFindOpen(false);
    setFindTerm('');
    setFindActiveIndex(0);
  }, [setFindActiveIndex, setFindTerm]);

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
    const { fontSize } = euiFontSize(euiThemeContext, typographyScale, { unit: 'px' });
    const cellPadding = parseFloat(padding);
    const fontSizeValue = String(fontSize ?? (isCompact ? '12px' : '14px'));
    const numericFontSize = parseFloat(fontSizeValue);
    // Unified data table values use the code typography line height rather than
    // the tighter header typography line height.
    const numericLineHeight = numericFontSize * 1.6;
    // Mirrors EuiDataGrid's lineCount height, which truncates the computed line height and padding.
    const getRowHeightForLines = (lines: number) =>
      Math.ceil(lines * Math.trunc(numericLineHeight)) + Math.trunc(cellPadding) * 2;

    return {
      getRowHeightForLines,
      rowHeight: getRowHeightForLines(1),
      summaryRowHeight: getRowHeightForLines(3),
      fontSize: numericFontSize,
      headerFontSize: numericFontSize + 1,
      lineHeight: numericLineHeight,
      // Unified data table column headers use a fixed line height regardless of density.
      headerLineHeight: parseFloat(euiTheme.size.base),
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

  const {
    rowHeight,
    rowHeightLines: rowHeightLinesSetting,
    lineCountInput,
    onChangeRowHeight: onChangeRowHeightSetting,
    onChangeRowHeightLines: onChangeRowHeightLinesSetting,
  } = useRowHeight({
    type: RowHeightType.row,
    storage,
    consumer,
    key: 'dataGridRowHeight',
    defaultRowHeight: ROWS_HEIGHT_OPTIONS.default,
    configRowHeight,
    rowHeightState,
    onUpdateRowHeight,
  });

  const rowHeightLines = isJsonMode ? ROWS_HEIGHT_OPTIONS.auto : rowHeightLinesSetting;
  const onChangeRowHeight = isJsonMode ? undefined : onChangeRowHeightSetting;
  const onChangeRowHeightLines = isJsonMode ? undefined : onChangeRowHeightLinesSetting;

  const isAutoRowHeight = rowHeightLines === ROWS_HEIGHT_OPTIONS.auto;
  const isAutoHeaderRowHeight = headerRowHeightLines === ROWS_HEIGHT_OPTIONS.auto;
  const isHeaderMultiline =
    !isAutoHeaderRowHeight && headerRowHeightLines > ROWS_HEIGHT_OPTIONS.single;

  const headerCellMinHeightPx = useMemo(() => {
    if (isAutoHeaderRowHeight) {
      return undefined;
    }
    const lines = Math.max(1, headerRowHeightLines);
    return Math.ceil(lines * densityCfg.headerLineHeight + densityCfg.cellPadding * 2);
  }, [
    densityCfg.cellPadding,
    densityCfg.headerLineHeight,
    headerRowHeightLines,
    isAutoHeaderRowHeight,
  ]);

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
      left: [
        ...(getRowIndicator ? [ROW_INDICATOR_COLUMN_ID] : []),
        ...CONTROL_COLUMN_IDS,
        ...pinnedDataColumnIds,
      ],
    }),
    [getRowIndicator, pinnedDataColumnIds]
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
      prevMeta?.displayedColumns !== displayedColumns || prevMeta?.displayedRows !== displayedRows;

    if (metaChanged) {
      const nextMeta: RenderDocumentViewMeta = {
        displayedColumns,
        displayedRows,
      };
      setRenderDocumentViewMeta(nextMeta);
      prevRenderDocumentViewMeta.current = nextMeta;
    }
  }, [displayedColumns, displayedRows, expandedDoc, renderDocumentView, setRenderDocumentViewMeta]);

  // Like UnifiedDataTable, filter with the data view field (e.g. scripted fields need the script).
  const onFilterWithField = useCallback<NonNullable<UnifiedDataTableProps['onFilter']>>(
    (field, value, mode) =>
      onFilter?.(
        typeof field === 'string'
          ? getDataViewFieldFromDataSource({ dataView, dataSource, fieldName: field }) ?? field
          : field,
        value,
        mode
      ),
    [dataSource, dataView, onFilter]
  );
  const onFilterRef = useRef(onFilter ? onFilterWithField : undefined);
  onFilterRef.current = onFilter ? onFilterWithField : undefined;

  // ── UI actions cell actions (same source as UnifiedDataTable), shown in the cell popover ──
  const getCellValue = useCallback<UseDataGridColumnsCellActionsProps['getCellValue']>(
    (fieldName, rowIndex) =>
      displayedRows[rowIndex % displayedRows.length].flattened[fieldName] as Serializable,
    [displayedRows]
  );
  const cellActionsFields = useMemo<UseDataGridColumnsCellActionsProps['fields']>(() => {
    if (!cellActionsTriggerId) {
      return undefined;
    }
    return effectiveColumns.map(
      (columnName) =>
        getDataViewFieldFromDataSource({
          dataView,
          dataSource,
          fieldName: columnName,
        })?.toSpec() ?? { name: '', type: '', aggregatable: false, searchable: false }
    );
  }, [cellActionsTriggerId, effectiveColumns, dataView, dataSource]);
  const allCellActionsMetadata = useMemo(
    () => ({ dataViewId: dataView.id, ...(cellActionsMetadata ?? {}) }),
    [dataView, cellActionsMetadata]
  );
  const columnsCellActions = useDataGridColumnsCellActions({
    fields: cellActionsFields,
    getCellValue,
    triggerId: cellActionsTriggerId,
    metadata: allCellActionsMetadata,
  });
  const columnCellActionsRef = useRef<CellPopoverActionsByColumn>({});
  columnCellActionsRef.current = useMemo(
    () =>
      Object.fromEntries(
        effectiveColumns.map((columnName, index) => [
          columnName,
          { colIndex: index, actions: columnsCellActions[index] ?? [] },
        ])
      ),
    [columnsCellActions, effectiveColumns]
  );

  const setPopoverStateRef = useRef<SetCellPopoverState>(() => {});
  const closeCellPopover = useCallback(() => setPopoverStateRef.current(null), []);
  // Popover content is rendered like UnifiedDataTable's (e.g. the JSON editor for the summary column).
  const renderCellValue = useMemo(
    () =>
      getRenderCellValueFn({
        dataView,
        rows: displayedRows,
        shouldShowFieldHandler,
        closePopover: closeCellPopover,
        fieldFormats,
        maxEntries: maxDocFieldsDisplayed,
        externalCustomRenderers,
        isCompressed: dataGridDensity === DataGridDensity.COMPACT,
        dataSource,
        documentsDisplayMode,
        jsonModeSettings: jsonModeSettingsState,
        selectedColumns: columns,
      }),
    [
      closeCellPopover,
      columns,
      dataSource,
      dataGridDensity,
      dataView,
      displayedRows,
      documentsDisplayMode,
      externalCustomRenderers,
      fieldFormats,
      jsonModeSettingsState,
      shouldShowFieldHandler,
      maxDocFieldsDisplayed,
    ]
  );
  const renderCellValueRef = useRef(renderCellValue);
  renderCellValueRef.current = renderCellValue;
  const setPopoverState = useCallback<SetCellPopoverState>((state) => {
    setPopoverStateRef.current(state);
  }, []);

  const stopPropagation = useCallback((e: React.SyntheticEvent) => e.stopPropagation(), []);

  const valueToStringConverter: ValueToStringConverter = useCallback(
    (rowIndex, columnId, options) =>
      convertValueToString({
        rowIndex,
        rows,
        dataView,
        columnId,
        fieldFormats,
        dataSource,
        options,
      }),
    [dataSource, dataView, fieldFormats, rows]
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

  const inlineRowControlSlots = getInlineRowControlSlots(rowAdditionalLeadingControls);
  const actionsColumnWidth =
    densityCfg.cellPadding * 2 +
    CONTROL_COL_WIDTH +
    (rowAdditionalLeadingControls
      ?.slice(0, inlineRowControlSlots)
      .reduce((width, control) => width + (control.width ?? CONTROL_COL_WIDTH), 0) ?? 0) +
    ((rowAdditionalLeadingControls?.length ?? 0) > inlineRowControlSlots ? CONTROL_COL_WIDTH : 0);

  // ── Build TanStack column defs ──
  const tanstackColumns: ColumnDef<DataTableRecord>[] = useMemo(() => {
    const defs: ColumnDef<DataTableRecord>[] = [];

    // Row indicator column, only when a profile provides one (like UnifiedDataTable).
    if (getRowIndicator) {
      defs.push({
        id: ROW_INDICATOR_COLUMN_ID,
        header: '',
        size: ROW_INDICATOR_COL_WIDTH,
        minSize: ROW_INDICATOR_COL_WIDTH,
        maxSize: ROW_INDICATOR_COL_WIDTH,
        enableResizing: false,
        enableSorting: false,
        enablePinning: false,
        meta: { isControl: true, isRowIndicator: true },
        cell: function IndicatorCell({ row }) {
          return <RowIndicatorCell record={row.original} getRowIndicator={getRowIndicator} />;
        },
      });
    }

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
            data-test-subj={`dscGridSelectDoc-${record.id}`}
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
      header: '',
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
      header: () =>
        isJsonMode ? (
          getColumnDisplayName(SOURCE_COLUMN_ID, undefined, undefined, 'json')
        ) : (
          <UnifiedDataTableSourceColumnHeader headerRowHeight={headerRowHeightLines} />
        ),
      size: 1,
      minSize: 0,
      enableResizing: false,
      enableSorting: false,
      meta: { isSummary: true },
      cell: ({ row }) =>
        isJsonMode ? (
          <SourceDocumentJsonMode
            row={row.original}
            dataView={dataView}
            dataSource={dataSource}
            shouldShowFieldHandler={shouldShowFieldHandler}
            fieldFormats={fieldFormats}
            jsonModeSettings={jsonModeSettingsState}
            selectedColumns={columns}
            onFilter={onFilter}
          />
        ) : externalCustomRenderers?.[SOURCE_COLUMN_ID] ? (
          // Same value wrapper UnifiedDataTable puts around custom renderers.
          <span className="unifiedDataTable__cellValue">
            <CustomDataCell
              Renderer={externalCustomRenderers[SOURCE_COLUMN_ID]}
              row={row.original}
              rowIndex={row.index}
              columnId={SOURCE_COLUMN_ID}
              colIndex={effectiveColumns.indexOf(SOURCE_COLUMN_ID)}
              dataView={dataView}
              fieldFormats={fieldFormats}
              dataSource={dataSource}
              isCompressed={dataGridDensity === DataGridDensity.COMPACT}
            />
          </span>
        ) : (
          <SummaryCellContent
            row={row.original}
            dataView={dataView}
            shouldShowFieldHandler={shouldShowFieldHandler}
            fieldFormats={fieldFormats}
            dataSource={dataSource}
            isCompressed={dataGridDensity === DataGridDensity.COMPACT}
            maxEntries={maxDocFieldsDisplayed}
          />
        ),
    };

    if (isSummaryMode) {
      // Same check as UnifiedDataTable, e.g. no time column when an ES|QL query drops it.
      if (shouldPrependTimeFieldColumn && timeFieldName) {
        const timeField = getDataViewFieldFromDataSource({
          dataView,
          dataSource,
          fieldName: timeFieldName,
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
            const TimeRenderer = externalCustomRenderers?.[timeFieldName];
            if (TimeRenderer) {
              return (
                <CustomDataCell
                  Renderer={TimeRenderer}
                  row={row.original}
                  rowIndex={row.index}
                  columnId={timeFieldName}
                  colIndex={0}
                  dataView={dataView}
                  fieldFormats={fieldFormats}
                  dataSource={dataSource}
                  isCompressed={dataGridDensity === DataGridDensity.COMPACT}
                />
              );
            }
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
      for (const [colIndex, colId] of effectiveColumns.entries()) {
        if (colId === SOURCE_COLUMN_ID) {
          defs.push(summaryColumn);
          continue;
        }
        const isTimeField = colId === timeFieldName;
        const dataViewField = getDataViewFieldFromDataSource({
          dataView,
          dataSource,
          fieldName: colId,
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
            dataSource,
            columnName: colId,
            columnSchema,
            dataViewField,
          });
        const CustomRenderer = externalCustomRenderers?.[colId];

        defs.push({
          id: colId,
          accessorFn: (r) => r.flattened[colId],
          header: settings?.columns?.[colId]?.display ?? colId,
          size: isTimeField
            ? getTimeColumnWidth(timeFieldName, {}, settings)
            : settings?.columns?.[colId]?.width ?? DEFAULT_COL_WIDTH,
          minSize: MIN_COL_WIDTH,
          enableSorting: columnIsSortable,
          meta: {
            isTimestamp: isTimeField,
            fieldName: colId,
            formatValue,
            canFilter: shouldShowFieldFilterInOutActions({
              dataViewField,
              hideFilteringOnComputedColumns,
              onFilter,
            }),
          },
          cell: function DataCell({ getValue, row }) {
            // Top-level object columns of the fields API, rendered like UnifiedDataTable does.
            if (
              !CustomRenderer &&
              !dataViewField &&
              row.original.raw.fields &&
              !(row.original.raw.fields as Record<string, unknown[]>)[colId]
            ) {
              const RenderCellValue = renderCellValueRef.current;
              return (
                <RenderCellValue
                  rowIndex={displayedRows.indexOf(row.original)}
                  colIndex={colIndex}
                  columnId={colId}
                  isDetails={false}
                  isExpandable={false}
                  isExpanded={false}
                  setCellProps={noop}
                />
              );
            }
            if (CustomRenderer) {
              return (
                <CustomDataCell
                  Renderer={CustomRenderer}
                  row={row.original}
                  rowIndex={row.index}
                  columnId={colId}
                  colIndex={colIndex}
                  dataView={dataView}
                  fieldFormats={fieldFormats}
                  dataSource={dataSource}
                  isCompressed={dataGridDensity === DataGridDensity.COMPACT}
                />
              );
            }
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
    dataSource,
    externalCustomRenderers,
    dataGridDensity,
    dataView,
    effectiveColumns,
    fieldFormats,
    isSortEnabled,
    isSummaryMode,
    isJsonMode,
    jsonModeSettingsState,
    columns,
    onFilter,
    settings,
    shouldShowFieldHandler,
    timeFieldName,
    rowAdditionalLeadingControls,
    headerRowHeightLines,
    actionsColumnWidth,
    onToggleExpandDoc,
    maxDocFieldsDisplayed,
    displayedRows,
    hideFilteringOnComputedColumns,
    shouldPrependTimeFieldColumn,
    getRowIndicator,
  ]);

  const dataColumns = useMemo<TanStackDataColumnDescriptor[]>(() => {
    if (isSummaryMode) {
      const cols: Array<{ id: string; isSummary?: boolean; isTimestamp?: boolean }> = [];
      // Same check as UnifiedDataTable, e.g. no time column when an ES|QL query drops it.
      if (shouldPrependTimeFieldColumn && timeFieldName) {
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
  }, [effectiveColumns, isSummaryMode, timeFieldName, shouldPrependTimeFieldColumn]);

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
        leadingControlColumnsWidth:
          (getRowIndicator ? ROW_INDICATOR_COL_WIDTH : 0) + SELECT_COL_WIDTH + actionsColumnWidth,
      }),
    [
      actionsColumnWidth,
      getRowIndicator,
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

      const dataViewField = getDataViewFieldFromDataSource({
        dataView,
        dataSource,
        fieldName: columnId,
      });
      const headerLabel = getColumnDisplayName(
        columnId,
        dataViewField?.displayName,
        settings?.columns?.[columnId]?.display ??
          (typeof column.columnDef.header === 'string' ? column.columnDef.header : undefined),
        'table'
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
      dataSource,
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
    return densityCfg.getRowHeightForLines(rowHeightLines);
  }, [rowHeightLines, densityCfg, isAutoRowHeight, isSummaryMode]);
  const totalColCount = table.getVisibleLeafColumns().length;

  // Filled by TanStackGridBody, which owns the virtualizer.
  const virtualizerRef = useRef<RowVirtualizer | null>(null);

  // Same as UnifiedDataTable: go to the page of an expanded document (e.g. from a shared link).
  // The adapter exposes the virtualizer through the EuiDataGrid ref API the hook expects.
  const scrollToItemRef = useRef<EuiDataGridRefProps>({
    setIsFullScreen: noop,
    setFocusedCell: noop,
    openCellPopover: noop,
    closeCellPopover: noop,
    scrollTo: noop,
    scrollToItem: ({ rowIndex, align }) => {
      if (rowIndex !== undefined) {
        virtualizerRef.current?.scrollToIndex(rowIndex, {
          align: align === 'smart' ? 'auto' : align,
        });
      }
    },
  });
  useScrollToExpandedDoc({
    expandedDoc,
    displayedRows,
    paginationMode,
    isPaginationEnabled,
    pageIndex: currentPageIndex,
    pageSize: currentPageSize,
    onChangePageIndex: changeCurrentPageIndex,
    dataGridRef: scrollToItemRef,
    dataGridWrapper,
  });

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

  // Single page mode only shows the footer once scrolled to the bottom, like UnifiedDataTable.
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  useEffect(() => {
    if (loadingState === DataLoadingState.loadingMore) {
      setHasScrolledToBottom(false);
    }
  }, [loadingState]);

  useEffect(() => {
    const scrollEl = parentRef.current;
    if (!scrollEl || paginationMode === 'multiPage' || loadingState !== DataLoadingState.loaded) {
      return;
    }
    let rafId: number;
    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setHasScrolledToBottom((prevHasScrolledToBottom) => {
          // Account for footer height when it's visible to avoid flickering
          const scrollBottomMargin = prevHasScrolledToBottom ? 140 : 100;
          const isScrollable = scrollEl.scrollHeight > scrollEl.offsetHeight;
          const isScrolledToBottom =
            scrollEl.scrollTop + scrollEl.offsetHeight >=
            scrollEl.scrollHeight - scrollBottomMargin;
          return isScrollable && isScrolledToBottom;
        });
      });
    };
    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      scrollEl.removeEventListener('scroll', handleScroll);
    };
  }, [loadingState, paginationMode]);

  // ── Ctrl+F to open find bar ──
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const setWrapperRef = useCallback(
    (element: HTMLDivElement | null) => {
      wrapperRef.current = element;
      setDataGridWrapper(element);
    },
    [setDataGridWrapper]
  );
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
        '--tsg-header-font-size': `${densityCfg.headerFontSize}px`,
        '--tsg-line-height': `${densityCfg.lineHeight}px`,
        '--tsg-header-line-height': `${densityCfg.headerLineHeight}px`,
        '--tsg-cell-padding-v': `${densityCfg.cellPadding}px`,
        '--tsg-cell-padding-h': `${densityCfg.cellPadding}px`,
        '--tsg-header-max-lines': isAutoHeaderRowHeight
          ? 'none'
          : String(Math.max(headerRowHeightLines, 1)),
        '--tsg-body-max-lines': isAutoRowHeight ? 'none' : String(Math.max(rowHeightLines, 1)),
        // Like UnifiedDataTable: keep new lines unless rows are limited to a single line.
        '--tsg-body-white-space': !isAutoRowHeight && rowHeightLines <= 1 ? 'nowrap' : 'pre-wrap',
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
  const replaceSelectedDocs = useCallback(
    (docIds: string[]) => {
      setSelectedRows(new Set(docIds));
    },
    [setSelectedRows]
  );

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

  // Same compact empty state as UnifiedDataTable.
  if (isEmpty && !isFilterActive) {
    return (
      <div
        className="euiDataGrid__noResults"
        css={styles.noResults}
        data-test-subj="discoverDocTable"
        data-table-loaded={loadingState === DataLoadingState.loaded}
        data-document-number={0}
      >
        <EuiText size="xs" color="subdued" textAlign="center">
          <EuiIcon type="discoverApp" size="m" color="subdued" aria-hidden="true" />
          <EuiSpacer size="s" />
          {i18n.translate('discover.grid.tanStack.noResultsFound', {
            defaultMessage: 'No results found',
          })}
        </EuiText>
      </div>
    );
  }

  if (isCompareActive) {
    return (
      <div
        ref={setWrapperRef}
        id={dataGridId}
        className={isFullScreen ? 'euiDataGrid--fullScreen' : undefined}
        css={[styles.wrapper, isFullScreen && styles.fullScreen]}
        style={densityVars}
        data-test-subj="discoverDocTable"
        data-table-loaded={loadingState === DataLoadingState.loaded}
        data-document-number={displayedRows.length}
      >
        <TanStackCompareDocuments
          consumer={consumer}
          ariaLabelledBy={ariaLabelledBy}
          dataView={dataView}
          dataSource={dataSource}
          selectedFieldNames={effectiveColumns}
          selectedDocIds={selectedDocIds}
          forceShowAllFields={isSummaryMode}
          showFullScreenButton={showFullScreenButton}
          isFullScreen={isFullScreen}
          onToggleFullScreen={toggleFullScreen}
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
      ref={setWrapperRef}
      id={dataGridId}
      className={isFullScreen ? 'euiDataGrid--fullScreen' : undefined}
      css={[styles.wrapper, isFullScreen && styles.fullScreen]}
      style={densityVars}
      // Same test attributes as UnifiedDataTable, so test helpers work with both grids.
      data-test-subj="discoverDocTable"
      data-table-loaded={loadingState === DataLoadingState.loaded}
      data-document-number={displayedRows.length}
    >
      {/* Toolbar */}
      <div css={styles.toolbar} data-test-subj="unifiedDataTableToolbar">
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
                              i18n.translate('discover.grid.tanStack.compareSelectedButtonLabel', {
                                defaultMessage: 'Compare selected',
                              })
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
                      {i18n.translate('discover.grid.tanStack.copySelectionAsMarkdownButtonLabel', {
                        defaultMessage: 'Copy selection as Markdown',
                      })}
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
                        isFilterActive ? 'dscGridShowAllDocuments' : 'dscGridShowSelectedDocuments'
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
          {shouldSuggestToSelectAll && (
            <EuiFlexItem grow={false} css={styles.toolbarControlButton}>
              <EuiDataGridToolbarControl
                css={styles.toolbarTextControl}
                data-test-subj="dscGridSelectAllDocs"
                onClick={() => {
                  setIsSelectionPopoverOpen(false);
                  selectAllRows();
                }}
              >
                {i18n.translate('discover.grid.tanStack.selectAllDocsButtonLabel', {
                  defaultMessage: 'Select all {rowsCount}',
                  values: { rowsCount: rows.length.toLocaleString() },
                })}
              </EuiDataGridToolbarControl>
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
                      persistVisibleColumns(effectiveColumns.filter((columnId) => columnId !== id));
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
          {headerSortEnabled && !isJsonMode && (
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
                panelProps={{ 'data-test-subj': 'dataGridColumnSortingPopover' }}
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
          )}
          <div css={styles.toolbarControlGroup}>
            <div
              css={isFindOpen ? styles.toolbarSearchControl : styles.toolbarIconControlContainer}
            >
              {isFindOpen ? (
                <FindInTableBar
                  initialTerm={findTerm}
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
                        title: i18n.translate('discover.grid.tanStack.keyboardShortcutsCloseKey', {
                          defaultMessage: 'Escape',
                        }),
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
                      aria-label={i18n.translate('discover.grid.tanStack.gridDensityButtonLabel', {
                        defaultMessage: 'Display options',
                      })}
                      size="xs"
                      color="text"
                      onClick={() => setIsDensityPopoverOpen((v) => !v)}
                      aria-expanded={isDensityPopoverOpen}
                      data-test-subj="dataGridDisplaySelectorButton"
                    />
                  </EuiToolTip>
                }
                isOpen={isDensityPopoverOpen}
                closePopover={() => setIsDensityPopoverOpen(false)}
                anchorPosition="downRight"
                panelPaddingSize="s"
                panelProps={{
                  css: logicalStyle('width', displayPopoverWidth),
                  'data-test-subj': 'dataGridDisplaySelectorPopover',
                }}
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
                        onChangeDataGridDensity(DATA_GRID_DENSITY_STYLE_MAP[id as DataGridDensity]);
                      }}
                      buttonSize="compressed"
                      isFullWidth
                      data-test-subj="densityButtonGroup"
                    />
                  }
                  additionalContent={additionalDisplaySettingsContent}
                  documentsDisplayMode={documentsDisplayMode}
                  onChangeDocumentsDisplayMode={(mode) => {
                    // UnifiedDataTable remounts on a display mode change, which closes this popover.
                    setIsDensityPopoverOpen(false);
                    onUpdateDocumentsDisplayMode?.(mode);
                  }}
                  jsonModeSettings={jsonModeSettingsState}
                  onChangeJsonModeSettings={onUpdateJsonModeSettings}
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
      {toolbarBottomSection}

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
            useRowVirtualizer={useRowVirtualizer}
            isFullScreen={isFullScreen}
            tableRows={tableRows}
            rowIndexOffset={isMultiPagePagination ? currentPageIndex * currentPageSize : 0}
            columnDefs={tanstackColumns}
            rowHeight={baseRowHeight}
            isAutoRowHeight={isAutoRowHeight}
            scrollKey={scrollKey}
            totalWidth={totalWidth}
            styles={styles}
            selectedRows={selectedRows}
            expandedDocId={currentExpandedDoc?.id}
            focusedCell={focusedCell}
            onFilter={onFilterRef.current}
            setPopoverState={setPopoverState}
            findTerm={findTerm}
            findActiveMatch={pageFindActiveMatch}
            getColumnStyle={getColumnStyle}
            colCount={totalColCount}
            onKeyDown={handleGridKeyDown}
            header={headerGroupsRaw.map((headerGroup) => (
              <div
                key={headerGroup.id}
                css={styles.headerRow}
                data-test-subj="dataGridHeader"
                role="row"
                aria-rowindex={1}
                style={{ width: totalWidth }}
              >
                {headerGroup.headers.map((header) => {
                  const isControl = header.column.columnDef.meta?.isControl;
                  const isRowIndicator = header.column.columnDef.meta?.isRowIndicator;
                  const isSelect = header.column.columnDef.meta?.isSelect;
                  const isSummary = header.column.columnDef.meta?.isSummary;
                  const sortDir = header.column.getIsSorted();
                  const colId = header.column.id;
                  const isDraggable =
                    !isControl && !isSelect && !isSummary && Boolean(onSetColumns);
                  const isDragging = dragState.dragging === colId;
                  const isDragOver = dragState.over === colId && dragState.dragging !== colId;
                  const dataViewField = getDataViewFieldFromDataSource({
                    dataView,
                    dataSource,
                    fieldName: colId,
                  });
                  const columnDisplayName = getColumnDisplayName(
                    colId,
                    dataViewField?.displayName,
                    settings?.columns?.[colId]?.display,
                    documentsDisplayMode
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
                    header.column.getIsPinned() === 'left' && header.column.getIsLastColumn('left');

                  if (isSelect) {
                    return (
                      <div
                        key={header.id}
                        className={isPinnedHeader ? 'tsg-pinnedHeaderCell' : undefined}
                        css={[
                          styles.selectHeaderCell,
                          isLastLeftPinnedHeader && styles.pinnedCellShadow,
                        ]}
                        style={{
                          ...headerColumnStyle,
                          ...(headerCellMinHeightPx != null
                            ? { minHeight: headerCellMinHeightPx }
                            : undefined),
                        }}
                        role="columnheader"
                        data-test-subj={`dataGridHeaderCell-${colId}`}
                        data-gridcell-column-id={colId}
                      >
                        <EuiCheckbox
                          id="select-all"
                          data-test-subj="selectAllDocsOnPageToggle"
                          checked={allSelected}
                          indeterminate={someSelected}
                          onChange={toggleSelectAll}
                          aria-label={selectAllOnPageLabel}
                          title={selectAllOnPageLabel}
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={header.id}
                      className={isPinnedHeader ? 'tsg-pinnedHeaderCell' : undefined}
                      css={[
                        isRowIndicator
                          ? styles.rowIndicatorHeaderCell
                          : isControl
                          ? styles.controlHeaderCell
                          : styles.headerCell,
                        !isControl && isHeaderMultiline && styles.headerCellMultiline,
                        !isControl &&
                          !isSummary &&
                          header.column.getCanResize() &&
                          styles.headerCellResizable,
                        isLastLeftPinnedHeader && styles.pinnedCellShadow,
                        isDraggable && styles.headerCellDraggable,
                        isDragging && styles.headerCellDragging,
                        isDragOver && styles.headerCellDragOver,
                      ]}
                      style={{
                        ...headerColumnStyle,
                        ...(headerCellMinHeightPx != null
                          ? { minHeight: headerCellMinHeightPx }
                          : undefined),
                      }}
                      role="columnheader"
                      aria-sort={
                        sortDir === 'asc'
                          ? 'ascending'
                          : sortDir === 'desc'
                          ? 'descending'
                          : undefined
                      }
                      data-test-subj={`dataGridHeaderCell-${colId}`}
                      data-gridcell-column-id={colId}
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
                        (colId === EXPAND_COLUMN_ID ? (
                          <TanStackActionsColumnHeader styles={styles} />
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        ))}
                      {!isControl && (
                        <TanStackHeaderActionsBridge
                          styles={styles}
                          isHeaderMultiline={isHeaderMultiline}
                          reserveResizeHandlePadding={!isSummary && header.column.getCanResize()}
                          actionsProps={{
                            columnId: colId,
                            columnDisplayName,
                            columnIndex,
                            visibleColumnIds: effectiveColumns,
                            dataView,
                            dataSource,
                            settings,
                            columnSizing,
                            isSummaryMode,
                            isSortEnabled: headerSortEnabled,
                            sort,
                            onSort,
                            persistVisibleColumns,
                            onResize,
                            onAutoFitColumn: handleAutoFitColumn,
                            onTogglePinColumn: !isSummary ? handleTogglePinColumn : undefined,
                            isColumnPinned: pinnedDataColumnIds.includes(colId),
                            timeFieldName,
                            toastNotifications,
                            valueToStringConverter,
                            rowsCount: displayedRows.length,
                            editField,
                            hasEditDataViewPermission,
                          }}
                        >
                          {showColumnTokens &&
                            !isSummary &&
                            !header.column.columnDef.meta?.isTimestamp &&
                            (() => {
                              const fieldName = header.column.columnDef.meta?.fieldName;
                              if (!fieldName) return null;
                              if (dataSource?.kind === 'esql') {
                                const esqlColumn = dataSource.getColumn(fieldName);
                                const iconType =
                                  esqlColumn && getFieldIconType(columnToFieldBase(esqlColumn));
                                if (iconType && iconType !== 'unknown') {
                                  return (
                                    <FieldIcon type={iconType} css={styles.headerCellFieldIcon} />
                                  );
                                }
                              } else {
                                const dvField = dataView.getFieldByName(fieldName);
                                if (dvField) {
                                  return (
                                    <FieldIcon
                                      {...getFieldIconProps(dvField)}
                                      css={styles.headerCellFieldIcon}
                                    />
                                  );
                                }
                              }
                              return null;
                            })()}
                          <TanStackHeaderCellText
                            text={columnDisplayName}
                            styles={styles}
                            multiline={isHeaderMultiline}
                          />
                          {header.column.columnDef.meta?.isTimestamp && (
                            <EuiIconTip
                              type="clock"
                              color="subdued"
                              size="m"
                              anchorProps={{ css: styles.headerCellIcon }}
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
                                size="m"
                                color="subdued"
                                aria-hidden={true}
                              />
                            </span>
                          )}
                        </TanStackHeaderActionsBridge>
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
              {renderDocumentView(currentExpandedDoc, displayedRows, displayedColumns, dataSource)}
            </span>
          )}
      </div>

      <CellPopoverHost
        setPopoverStateRef={setPopoverStateRef}
        scrollParentRef={parentRef}
        onFilterRef={onFilterRef}
        columnCellActionsRef={columnCellActionsRef}
        renderCellValueRef={renderCellValueRef}
        styles={styles}
      />

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
            hasScrolledToBottom={paginationMode !== 'multiPage' ? hasScrolledToBottom : true}
          />
        )}
    </div>
  );
};

/**
 * Restores selection, pagination, comparison and in-table search per Discover tab, through the same
 * `initialState` / `onInitialStateChange` props as UnifiedDataTable.
 */
export const TanStackDataGrid = withUnifiedDataTableRestorableState(TanStackDataGridComponent);

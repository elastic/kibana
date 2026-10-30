/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  EuiDataGridColumnVisibility,
  EuiDataGridInMemory,
  EuiDataGridProps,
  EuiDataGridRefProps,
  EuiDataGridRowHeightsOptions,
  EuiDataGridSchemaDetector,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
} from '@elastic/eui';
import { EuiDataGrid, useGeneratedHtmlId } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React, { forwardRef, useCallback, useMemo, useState } from 'react';
import type { ForwardedRef } from 'react';
import type { DataSource } from '@kbn/data-source';
import { DATA_GRID_STYLE_DEFAULT } from '../../constants';
import { ComparisonControls } from './comparison_controls';
import { renderComparisonToolbar } from './comparison_toolbar';
import { useComparisonCellValue } from './hooks/use_comparison_cell_value';
import { useComparisonColumns } from './hooks/use_comparison_columns';
import { useComparisonCss } from './hooks/use_comparison_css';
import { useComparisonFields } from './hooks/use_comparison_fields';
import { useRestorableLocalStorage } from '../../restorable_state';
import type { DocMap } from '../../types';
import type { UnifiedDataTableRenderCustomComparisonToolbar } from './types';

export interface CompareDocumentsProps {
  id: string;
  wrapper: HTMLElement | null;
  consumer: string;
  ariaDescribedBy: string;
  ariaLabelledBy: string;
  dataView: DataView;
  dataSource?: DataSource;
  selectedFieldNames: string[];
  selectedDocIds: string[];
  schemaDetectors: EuiDataGridSchemaDetector[];
  forceShowAllFields: boolean;
  showFullScreenButton?: boolean;
  fieldFormats: FieldFormatsStart;
  docMap: DocMap;
  replaceSelectedDocs: (docIds: string[]) => void;
  setIsCompareActive: (isCompareActive: boolean) => void;
  /**
   * Optional custom body renderer for the comparison grid, whose rows are the compared fields.
   */
  renderCustomGridBody?: EuiDataGridProps['renderCustomGridBody'];
  /**
   * Optional decorator for the comparison grid's toolbar, e.g. to relocate it.
   */
  renderCustomToolbar?: UnifiedDataTableRenderCustomComparisonToolbar;
  onFullScreenChange?: EuiDataGridProps['onFullScreenChange'];
}

const COMPARISON_ROW_HEIGHT: EuiDataGridRowHeightsOptions = { defaultHeight: 'auto' };
const COMPARISON_IN_MEMORY: EuiDataGridInMemory = { level: 'sorting' };
const COMPARISON_GRID_STYLE: EuiDataGridStyle = {
  ...DATA_GRID_STYLE_DEFAULT,
  cellPadding: 'l',
  stripes: undefined,
};

const getStorageKey = (consumer: string, key: string) => `${consumer}:dataGridComparison${key}`;

const CompareDocumentsComponent = (
  {
    id,
    wrapper,
    consumer,
    ariaDescribedBy,
    ariaLabelledBy,
    dataView,
    dataSource,
    selectedFieldNames,
    selectedDocIds: originalSelectedDocIds,
    schemaDetectors,
    forceShowAllFields,
    showFullScreenButton,
    fieldFormats,
    docMap: originalDocMap,
    replaceSelectedDocs: originalReplaceSelectedDocs,
    setIsCompareActive,
    renderCustomGridBody,
    renderCustomToolbar,
    onFullScreenChange,
  }: CompareDocumentsProps,
  ref: ForwardedRef<EuiDataGridRefProps>
) => {
  // Snapshot docMap and selectedDocIds to ensure we don't lose access to the comparison docs
  // or their selection state if, for example, a time range change or auto refresh changes them.
  const [docMap] = useState<DocMap>(originalDocMap);
  const [selectedDocIds, setSelectedDocIds] = useState(originalSelectedDocIds);
  const replaceSelectedDocs = useCallback(
    (docIds: string[]) => {
      setSelectedDocIds(docIds);
      originalReplaceSelectedDocs(docIds);
    },
    [originalReplaceSelectedDocs]
  );
  const [showDiff, setShowDiff] = useRestorableLocalStorage(
    'comparisonSettingShowDiff',
    getStorageKey(consumer, 'ShowDiff'),
    true
  );
  const [diffMode, setDiffMode] = useRestorableLocalStorage(
    'comparisonSettingDiffMode',
    getStorageKey(consumer, 'DiffMode'),
    'basic'
  );
  const [showDiffDecorations, setShowDiffDecorations] = useRestorableLocalStorage(
    'comparisonSettingShowDiffDecorations',
    getStorageKey(consumer, 'ShowDiffDecorations'),
    true
  );
  const [showAllFields, setShowAllFields] = useRestorableLocalStorage(
    'comparisonSettingShowAllFields',
    getStorageKey(consumer, 'ShowAllFields'),
    false
  );
  const [showMatchingValues, setShowMatchingValues] = useRestorableLocalStorage(
    'comparisonSettingShowMatchingValues',
    getStorageKey(consumer, 'ShowMatchingValues'),
    true
  );

  const fieldColumnId = useGeneratedHtmlId({ prefix: 'fields' });
  const { comparisonFields, totalFields } = useComparisonFields({
    dataView,
    dataSource,
    selectedFieldNames,
    selectedDocIds,
    showAllFields: Boolean(forceShowAllFields || showAllFields),
    showMatchingValues: Boolean(showMatchingValues),
    docMap,
  });
  const comparisonColumns = useComparisonColumns({
    wrapper,
    dataSource,
    fieldColumnId,
    selectedDocIds,
    docMap,
    replaceSelectedDocs,
  });
  const comparisonColumnVisibility = useMemo<EuiDataGridColumnVisibility>(
    () => ({
      visibleColumns: comparisonColumns.map(({ id: columnId }) => columnId),
      setVisibleColumns: (visibleColumns) => {
        const [_fieldColumnId, ...newSelectedDocs] = visibleColumns;
        replaceSelectedDocs(newSelectedDocs);
      },
    }),
    [comparisonColumns, replaceSelectedDocs]
  );
  const additionalControls = useMemo(
    () => (
      <ComparisonControls
        dataSource={dataSource}
        selectedDocIds={selectedDocIds}
        showDiff={showDiff}
        diffMode={diffMode}
        showDiffDecorations={showDiffDecorations}
        showMatchingValues={showMatchingValues}
        showAllFields={showAllFields}
        forceShowAllFields={forceShowAllFields}
        setIsCompareActive={setIsCompareActive}
        setShowDiff={setShowDiff}
        setDiffMode={setDiffMode}
        setShowDiffDecorations={setShowDiffDecorations}
        setShowMatchingValues={setShowMatchingValues}
        setShowAllFields={setShowAllFields}
      />
    ),
    [
      diffMode,
      forceShowAllFields,
      dataSource,
      selectedDocIds,
      setDiffMode,
      setIsCompareActive,
      setShowAllFields,
      setShowDiff,
      setShowDiffDecorations,
      setShowMatchingValues,
      showAllFields,
      showDiff,
      showDiffDecorations,
      showMatchingValues,
    ]
  );
  const comparisonToolbarVisibility = useMemo<EuiDataGridToolBarVisibilityOptions>(
    () => ({
      showColumnSelector: false,
      showDisplaySelector: false,
      showFullScreenSelector: showFullScreenButton,
    }),
    [showFullScreenButton]
  );
  const renderCustomToolbarFn = useMemo<EuiDataGridProps['renderCustomToolbar'] | undefined>(() => {
    const renderToolbar = renderComparisonToolbar({
      additionalControls,
      comparisonFields,
      totalFields,
    });

    if (!renderCustomToolbar) {
      return renderToolbar;
    }

    return (toolbarProps) =>
      renderCustomToolbar({ toolbar: renderToolbar(toolbarProps), toolbarProps });
  }, [additionalControls, comparisonFields, totalFields, renderCustomToolbar]);
  const renderCellValue = useComparisonCellValue({
    dataView,
    dataSource,
    comparisonFields,
    fieldColumnId,
    selectedDocIds,
    diffMode: showDiff ? diffMode : undefined,
    fieldFormats,
    docMap,
  });
  const comparisonCss = useComparisonCss({
    diffMode: showDiff ? diffMode : undefined,
    showDiffDecorations,
  });

  return (
    <EuiDataGrid
      ref={ref}
      id={id}
      aria-describedby={ariaDescribedBy}
      aria-labelledby={ariaLabelledBy}
      gridStyle={COMPARISON_GRID_STYLE}
      toolbarVisibility={comparisonToolbarVisibility}
      columns={comparisonColumns}
      columnVisibility={comparisonColumnVisibility}
      rowCount={comparisonFields.length}
      rowHeightsOptions={COMPARISON_ROW_HEIGHT}
      inMemory={COMPARISON_IN_MEMORY}
      schemaDetectors={schemaDetectors}
      renderCellValue={renderCellValue}
      renderCustomToolbar={renderCustomToolbarFn}
      renderCustomGridBody={renderCustomGridBody}
      onFullScreenChange={onFullScreenChange}
      data-test-subj="unifiedDataTableCompareDocuments"
      css={comparisonCss}
    />
  );
};

const CompareDocuments = forwardRef(CompareDocumentsComponent);

// eslint-disable-next-line import/no-default-export
export default CompareDocuments;

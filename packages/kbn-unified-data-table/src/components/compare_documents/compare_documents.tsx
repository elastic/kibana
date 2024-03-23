/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiDataGrid,
  EuiDataGridColumnVisibility,
  EuiDataGridInMemory,
  EuiDataGridProps,
  EuiDataGridRowHeightsOptions,
  EuiDataGridSchemaDetector,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React, { useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { GRID_STYLE } from '../../constants';
import type { UnifiedDataTableRenderCustomToolbar } from '../data_table';
import { ComparisonControls } from './comparison_controls';
import { useComparisonCellValue } from './hooks/use_comparison_cell_value';
import { useComparisonColumns } from './hooks/use_comparison_columns';
import { useComparisonCss } from './hooks/use_comparison_css';
import { useComparisonFields } from './hooks/use_comparison_fields';
import type { DocumentDiffMode } from './types';

export interface CompareDocumentsProps {
  id: string;
  wrapper: HTMLElement | null;
  consumer: string;
  ariaDescribedBy: string;
  ariaLabelledBy: string;
  dataView: DataView;
  isPlainRecord: boolean;
  selectedFieldNames: string[];
  selectedDocs: string[];
  schemaDetectors: EuiDataGridSchemaDetector[];
  forceShowAllFields: boolean;
  showFullScreenButton?: boolean;
  fieldFormats: FieldFormatsStart;
  getDocById: (id: string) => DataTableRecord | undefined;
  setSelectedDocs: (selectedDocs: string[]) => void;
  setIsCompareActive: (isCompareActive: boolean) => void;
  renderCustomToolbar?: UnifiedDataTableRenderCustomToolbar;
}

const getStorageKey = (consumer: string, key: string) => `${consumer}:dataGrid${key}`;

const CompareDocuments = ({
  id,
  wrapper,
  consumer,
  ariaDescribedBy,
  ariaLabelledBy,
  dataView,
  isPlainRecord,
  selectedFieldNames,
  selectedDocs,
  schemaDetectors,
  forceShowAllFields,
  showFullScreenButton,
  fieldFormats,
  getDocById,
  setSelectedDocs,
  setIsCompareActive,
  renderCustomToolbar,
}: CompareDocumentsProps) => {
  const [showDiff, setShowDiff] = useLocalStorage(getStorageKey(consumer, 'ShowDiff'), true);
  const [diffMode, setDiffMode] = useLocalStorage<DocumentDiffMode>(
    getStorageKey(consumer, 'DiffMode'),
    'basic'
  );
  const [showDiffDecorations, setShowDiffDecorations] = useLocalStorage(
    getStorageKey(consumer, 'ShowDiffDecorations'),
    true
  );
  const [showAllFields, setShowAllFields] = useLocalStorage(
    getStorageKey(consumer, 'ShowAllFields'),
    false
  );
  const [showMatchingValues, setShowMatchingValues] = useLocalStorage(
    getStorageKey(consumer, 'ShowMatchingValues'),
    true
  );

  const fieldColumnId = useGeneratedHtmlId({ prefix: 'fields' });
  const comparisonFields = useComparisonFields({
    dataView,
    selectedFieldNames,
    selectedDocs,
    showAllFields: Boolean(forceShowAllFields || showAllFields),
    showMatchingValues: Boolean(showMatchingValues),
    getDocById,
  });
  const comparisonColumns = useComparisonColumns({
    wrapper,
    fieldColumnId,
    selectedDocs,
    getDocById,
    setSelectedDocs,
  });
  const comparisonColumnVisibility = useMemo<EuiDataGridColumnVisibility>(
    () => ({
      visibleColumns: comparisonColumns.map(({ id: columnId }) => columnId),
      setVisibleColumns: (visibleColumns) => {
        const [_fieldColumnId, ...newSelectedDocs] = visibleColumns;
        setSelectedDocs(newSelectedDocs);
      },
    }),
    [comparisonColumns, setSelectedDocs]
  );
  const comparisonRowCount = useMemo(() => comparisonFields.length, [comparisonFields.length]);
  const comparisonRowHeight = useMemo<EuiDataGridRowHeightsOptions>(
    () => ({ defaultHeight: 'auto' }),
    []
  );
  const comparisonInMemory = useMemo<EuiDataGridInMemory>(() => ({ level: 'sorting' }), []);
  const gridStyle = useMemo<EuiDataGridStyle>(() => ({ ...GRID_STYLE, stripes: undefined }), []);
  const additionalControls = useMemo(
    () => (
      <ComparisonControls
        isPlainRecord={isPlainRecord}
        selectedDocs={selectedDocs}
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
        renderCustomToolbar={renderCustomToolbar}
      />
    ),
    [
      diffMode,
      forceShowAllFields,
      isPlainRecord,
      renderCustomToolbar,
      selectedDocs,
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
      additionalControls,
    }),
    [additionalControls, showFullScreenButton]
  );
  const renderCustomToolbarFn = useMemo<EuiDataGridProps['renderCustomToolbar'] | undefined>(
    () =>
      renderCustomToolbar
        ? (toolbarProps) =>
            renderCustomToolbar({
              toolbarProps,
              gridProps: {
                additionalControls,
              },
            })
        : undefined,
    [renderCustomToolbar, additionalControls]
  );
  const ComparisonCellValue = useComparisonCellValue({
    dataView,
    comparisonFields,
    fieldColumnId,
    selectedDocs,
    showDiff,
    diffMode,
    fieldFormats,
    getDocById,
  });
  const comparisonCss = useComparisonCss({ diffMode, showDiffDecorations });

  return (
    <EuiDataGrid
      id={id}
      aria-describedby={ariaDescribedBy}
      aria-labelledby={ariaLabelledBy}
      gridStyle={gridStyle}
      toolbarVisibility={comparisonToolbarVisibility}
      columns={comparisonColumns}
      columnVisibility={comparisonColumnVisibility}
      rowCount={comparisonRowCount}
      rowHeightsOptions={comparisonRowHeight}
      inMemory={comparisonInMemory}
      schemaDetectors={schemaDetectors}
      renderCellValue={ComparisonCellValue}
      renderCustomToolbar={renderCustomToolbarFn}
      data-test-subj="comparisonTable"
      css={comparisonCss}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default CompareDocuments;

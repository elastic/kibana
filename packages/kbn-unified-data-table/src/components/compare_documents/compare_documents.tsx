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
import { memoize } from 'lodash';
import React, { useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { GRID_STYLE } from '../../constants';
import { ComparisonControls } from './comparison_controls';
import { renderComparisonToolbar } from './comparison_toolbar';
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
}

const COMPARISON_ROW_HEIGHT: EuiDataGridRowHeightsOptions = { defaultHeight: 'auto' };
const COMPARISON_IN_MEMORY: EuiDataGridInMemory = { level: 'sorting' };
const COMPARISON_GRID_STYLE: EuiDataGridStyle = { ...GRID_STYLE, stripes: undefined };

const getStorageKey = (consumer: string, key: string) => `${consumer}:dataGridComparison${key}`;

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
}: CompareDocumentsProps) => {
  // Memoize getDocById to ensure we don't lose access to the comparison docs if, for example,
  // a time range change or auto refresh causes the previous docs to no longer be available
  const [memoizedGetDocById] = useState(() => memoize(getDocById));
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
  const { comparisonFields, totalFields } = useComparisonFields({
    dataView,
    selectedFieldNames,
    selectedDocs,
    showAllFields: Boolean(forceShowAllFields || showAllFields),
    showMatchingValues: Boolean(showMatchingValues),
    getDocById: memoizedGetDocById,
  });
  const comparisonColumns = useComparisonColumns({
    wrapper,
    isPlainRecord,
    fieldColumnId,
    selectedDocs,
    getDocById: memoizedGetDocById,
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
      />
    ),
    [
      diffMode,
      forceShowAllFields,
      isPlainRecord,
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
    }),
    [showFullScreenButton]
  );
  const renderCustomToolbarFn = useMemo<EuiDataGridProps['renderCustomToolbar'] | undefined>(
    () =>
      renderComparisonToolbar({
        additionalControls,
        comparisonFields,
        totalFields,
      }),
    [additionalControls, comparisonFields, totalFields]
  );
  const renderCellValue = useComparisonCellValue({
    dataView,
    comparisonFields,
    fieldColumnId,
    selectedDocs,
    diffMode: showDiff ? diffMode : undefined,
    fieldFormats,
    getDocById: memoizedGetDocById,
  });
  const comparisonCss = useComparisonCss({
    diffMode: showDiff ? diffMode : undefined,
    showDiffDecorations,
  });

  return (
    <EuiDataGrid
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
      data-test-subj="unifiedDataTableCompareDocuments"
      css={comparisonCss}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default CompareDocuments;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
import { AdditionalFieldGroups } from '@kbn/unified-field-list';
import { memoize } from 'lodash';
import React, { useMemo, useState } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { DATA_GRID_STYLE_DEFAULT } from '../../constants';
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
  selectedDocIds: string[];
  schemaDetectors: EuiDataGridSchemaDetector[];
  forceShowAllFields: boolean;
  showFullScreenButton?: boolean;
  fieldFormats: FieldFormatsStart;
  getDocById: (id: string) => DataTableRecord | undefined;
  replaceSelectedDocs: (docIds: string[]) => void;
  setIsCompareActive: (isCompareActive: boolean) => void;
  additionalFieldGroups?: AdditionalFieldGroups;
}

const COMPARISON_ROW_HEIGHT: EuiDataGridRowHeightsOptions = { defaultHeight: 'auto' };
const COMPARISON_IN_MEMORY: EuiDataGridInMemory = { level: 'sorting' };
const COMPARISON_GRID_STYLE: EuiDataGridStyle = { ...DATA_GRID_STYLE_DEFAULT, stripes: undefined };

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
  additionalFieldGroups,
  selectedDocIds,
  schemaDetectors,
  forceShowAllFields,
  showFullScreenButton,
  fieldFormats,
  getDocById,
  replaceSelectedDocs,
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
    additionalFieldGroups,
    selectedDocIds,
    showAllFields: Boolean(forceShowAllFields || showAllFields),
    showMatchingValues: Boolean(showMatchingValues),
    getDocById: memoizedGetDocById,
  });
  const comparisonColumns = useComparisonColumns({
    wrapper,
    isPlainRecord,
    fieldColumnId,
    selectedDocIds,
    getDocById: memoizedGetDocById,
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
        isPlainRecord={isPlainRecord}
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
      isPlainRecord,
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
    selectedDocIds,
    diffMode: showDiff ? diffMode : undefined,
    fieldFormats,
    getDocById: memoizedGetDocById,
    additionalFieldGroups,
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

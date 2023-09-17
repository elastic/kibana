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
  EuiDataGridRowHeightsOptions,
  EuiDataGridSchemaDetector,
  EuiDataGridStyle,
  EuiDataGridToolBarVisibilityOptions,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React, { RefObject, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { GRID_STYLE } from '../../constants';
import { ComparisonControls } from './comparison_controls';
import { useComparisonCellValue } from './hooks/use_comparison_cell_value';
import { useComparisonColumns } from './hooks/use_comparison_columns';
import { useComparisonFields } from './hooks/use_comparison_fields';
import type { DocumentDiffMode } from './types';

export interface CompareDocumentsProps {
  wrapperRef: RefObject<HTMLElement>;
  consumer: string;
  ariaDescribedBy: string;
  ariaLabelledBy: string;
  dataView: DataView;
  selectedFieldNames: string[];
  selectedDocs: string[];
  schemaDetectors: EuiDataGridSchemaDetector[];
  forceShowAllFields: boolean;
  fieldFormats: FieldFormatsStart;
  getDocById: (id: string) => DataTableRecord | undefined;
  setSelectedDocs: (selectedDocs: string[]) => void;
  setIsCompareActive: (isCompareActive: boolean) => void;
}

const getStorageKey = (consumer: string, key: string) => `${consumer}:dataGrid${key}`;

const CompareDocuments = ({
  wrapperRef,
  consumer,
  ariaDescribedBy,
  ariaLabelledBy,
  dataView,
  selectedFieldNames,
  selectedDocs,
  schemaDetectors,
  forceShowAllFields,
  fieldFormats,
  getDocById,
  setSelectedDocs,
  setIsCompareActive,
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

  const fieldColumnId = useGeneratedHtmlId({ prefix: 'fields' });
  const comparisonFields = useComparisonFields({
    dataView,
    selectedFieldNames,
    showAllFields: Boolean(forceShowAllFields || showAllFields),
  });
  const comparisonColumns = useComparisonColumns({
    wrapperRef,
    fieldColumnId,
    selectedDocs,
    getDocById,
    setSelectedDocs,
  });
  const comparisonColumnVisibility: EuiDataGridColumnVisibility = useMemo(
    () => ({
      visibleColumns: comparisonColumns.map(({ id }) => id),
      setVisibleColumns: () => {},
    }),
    [comparisonColumns]
  );
  const comparisonRowCount = useMemo(() => comparisonFields.length, [comparisonFields.length]);
  const comparisonRowHeight: EuiDataGridRowHeightsOptions = useMemo(
    () => ({ defaultHeight: 'auto' }),
    []
  );
  const comparisonInMemory: EuiDataGridInMemory = useMemo(() => ({ level: 'sorting' }), []);
  const gridStyle: EuiDataGridStyle = useMemo(() => ({ ...GRID_STYLE, rowHover: undefined }), []);
  const additionalControls = useMemo(
    () => (
      <ComparisonControls
        showDiff={showDiff}
        diffMode={diffMode}
        showDiffDecorations={showDiffDecorations}
        showAllFields={showAllFields}
        forceShowAllFields={forceShowAllFields}
        setIsCompareActive={setIsCompareActive}
        setShowDiff={setShowDiff}
        setDiffMode={setDiffMode}
        setShowDiffDecorations={setShowDiffDecorations}
        setShowAllFields={setShowAllFields}
      />
    ),
    [
      diffMode,
      forceShowAllFields,
      setDiffMode,
      setIsCompareActive,
      setShowAllFields,
      setShowDiff,
      setShowDiffDecorations,
      showAllFields,
      showDiff,
      showDiffDecorations,
    ]
  );
  const comparisonToolbarVisibility: EuiDataGridToolBarVisibilityOptions = useMemo(
    () => ({
      showColumnSelector: false,
      showDisplaySelector: false,
      additionalControls,
    }),
    [additionalControls]
  );
  const ComparisonCellValue = useComparisonCellValue({
    dataView,
    comparisonFields,
    fieldColumnId,
    selectedDocs,
    showDiff,
    diffMode,
    showDiffDecorations,
    fieldFormats,
    getDocById,
  });

  return (
    <EuiDataGrid
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
      data-test-subj="comparisonTable"
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default CompareDocuments;

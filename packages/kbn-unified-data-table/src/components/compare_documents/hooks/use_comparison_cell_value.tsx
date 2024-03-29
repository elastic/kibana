/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiDataGridCellValueElementProps, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { formatFieldValue } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { getFieldTypeName } from '@kbn/field-utils';
import { FieldIcon } from '@kbn/react-field';
import classNames from 'classnames';
import { diffChars, diffJson, diffLines, diffWords } from 'diff';
import { isEqual } from 'lodash';
import React, { useCallback, useEffect, useMemo } from 'react';
import { CELL_CLASS } from '../../../utils/get_render_cell_value';
import type { DocumentDiffMode } from '../types';
import {
  ADDED_SEGMENT_CLASS,
  BASE_CELL_CLASS,
  DIFF_CELL_CLASS,
  FIELD_NAME_CLASS,
  MATCH_CELL_CLASS,
  REMOVED_SEGMENT_CLASS,
  SEGMENT_CLASS,
} from './use_comparison_css';

export interface UseComparisonCellValueProps {
  dataView: DataView;
  comparisonFields: string[];
  fieldColumnId: string;
  selectedDocs: string[];
  diffMode: DocumentDiffMode | undefined;
  fieldFormats: FieldFormatsStart;
  getDocById: (id: string) => DataTableRecord | undefined;
}

export const useComparisonCellValue = ({
  dataView,
  comparisonFields,
  fieldColumnId,
  selectedDocs,
  diffMode,
  fieldFormats,
  getDocById,
}: UseComparisonCellValueProps) => {
  const baseDocId = selectedDocs[0];
  const baseDoc = useMemo(() => getDocById(baseDocId)?.flattened, [baseDocId, getDocById]);

  return useCallback(
    (props: EuiDataGridCellValueElementProps) => (
      <CellValue
        dataView={dataView}
        comparisonFields={comparisonFields}
        fieldColumnId={fieldColumnId}
        baseDocId={baseDocId}
        baseDoc={baseDoc}
        diffMode={diffMode}
        fieldFormats={fieldFormats}
        getDocById={getDocById}
        {...props}
      />
    ),
    [
      baseDoc,
      baseDocId,
      comparisonFields,
      dataView,
      diffMode,
      fieldColumnId,
      fieldFormats,
      getDocById,
    ]
  );
};

type CellValueProps = Omit<UseComparisonCellValueProps, 'selectedDocs'> &
  EuiDataGridCellValueElementProps & {
    baseDocId: string;
    baseDoc: DataTableRecord['flattened'] | undefined;
  };

const EMPTY_VALUE = '-';

const CellValue = (props: CellValueProps) => {
  const { dataView, comparisonFields, fieldColumnId, rowIndex, columnId, getDocById } = props;
  const fieldName = comparisonFields[rowIndex];
  const field = useMemo(() => dataView.fields.getByName(fieldName), [dataView.fields, fieldName]);
  const comparisonDoc = useMemo(() => getDocById(columnId), [columnId, getDocById]);

  if (columnId === fieldColumnId) {
    return <FieldCellValue field={field} fieldName={fieldName} />;
  }

  if (!comparisonDoc) {
    return <span className={CELL_CLASS}>{EMPTY_VALUE}</span>;
  }

  return (
    <DiffCellValue {...props} field={field} fieldName={fieldName} comparisonDoc={comparisonDoc} />
  );
};

interface FieldCellValueProps {
  field: DataViewField | undefined;
  fieldName: string;
}

const FieldCellValue = ({ field, fieldName }: FieldCellValueProps) => {
  return (
    <EuiFlexGroup responsive={false} gutterSize="s">
      <EuiFlexItem grow={false}>
        <FieldIcon
          type={field?.type ?? 'unknown'}
          label={getFieldTypeName(field?.type)}
          scripted={field?.scripted}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="relative" className={FIELD_NAME_CLASS}>
          {field?.displayName ?? fieldName}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

type DiffCellValueProps = CellValueProps &
  FieldCellValueProps & {
    comparisonDoc: DataTableRecord;
  };

const DiffCellValue = ({
  dataView,
  field,
  fieldName,
  baseDocId,
  baseDoc,
  comparisonDoc,
  diffMode,
  columnId,
  fieldFormats,
  setCellProps,
}: DiffCellValueProps) => {
  const baseValue = baseDoc?.[fieldName];
  const comparisonValue = comparisonDoc?.flattened[fieldName];
  const isBaseDoc = columnId === baseDocId;
  const formattedBaseValue = useMemo(
    () => (isBaseDoc ? formatDiffValue(baseValue, false).value : undefined),
    [baseValue, isBaseDoc]
  );

  useEffect(() => {
    if (isBaseDoc) {
      setCellProps({ className: BASE_CELL_CLASS });
    } else if (diffMode !== 'basic') {
      setCellProps({ className: undefined });
    } else if (isEqual(baseValue, comparisonValue)) {
      setCellProps({ className: MATCH_CELL_CLASS });
    } else {
      setCellProps({ className: DIFF_CELL_CLASS });
    }
  }, [baseValue, columnId, comparisonValue, baseDocId, diffMode, setCellProps, isBaseDoc]);

  if (!diffMode || diffMode === 'basic') {
    return (
      <span
        className={CELL_CLASS}
        // formatFieldValue guarantees sanitized values
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: formatFieldValue(
            comparisonValue,
            comparisonDoc.raw,
            fieldFormats,
            dataView,
            field
          ),
        }}
      />
    );
  }

  if (formattedBaseValue) {
    return <span className={CELL_CLASS}>{formattedBaseValue || EMPTY_VALUE}</span>;
  }

  return (
    <DiffCellValueAdvanced
      baseValue={baseValue}
      comparisonValue={comparisonValue}
      diffMode={diffMode}
    />
  );
};

interface DiffCellValueAdvancedProps {
  baseValue: unknown;
  comparisonValue: unknown;
  diffMode: Exclude<DocumentDiffMode, 'basic' | null>;
}

const DiffCellValueAdvanced = ({
  baseValue,
  comparisonValue,
  diffMode,
}: DiffCellValueAdvancedProps) => {
  const diff = useDiff({ baseValue, comparisonValue, diffMode });
  const SegmentTag = diffMode === 'lines' ? 'div' : 'span';

  return (
    <span className={CELL_CLASS}>
      {diff.map((change, i) => (
        <SegmentTag
          key={`segment-${i}`}
          className={classNames(SEGMENT_CLASS, {
            [ADDED_SEGMENT_CLASS]: change.added,
            [REMOVED_SEGMENT_CLASS]: change.removed,
          })}
        >
          {change.value || EMPTY_VALUE}
        </SegmentTag>
      ))}
    </span>
  );
};

const useDiff = ({ baseValue, comparisonValue, diffMode }: DiffCellValueAdvancedProps) => {
  return useMemo(() => {
    const forceJson =
      baseValue != null &&
      comparisonValue != null &&
      ((hasLengthOne(baseValue) && !hasLengthOne(comparisonValue)) ||
        (!hasLengthOne(baseValue) && hasLengthOne(comparisonValue)));

    const { value: formattedBaseValue, isJson: baseValueIsJson } = formatDiffValue(
      baseValue,
      forceJson
    );

    const { value: formattedComparisonValue, isJson: comparisonValueIsJson } = formatDiffValue(
      comparisonValue,
      forceJson
    );

    if (diffMode === 'chars') {
      return diffChars(formattedBaseValue, formattedComparisonValue);
    }

    if (diffMode === 'words') {
      return diffWords(formattedBaseValue, formattedComparisonValue, { ignoreWhitespace: false });
    }

    return baseValueIsJson && comparisonValueIsJson
      ? diffJson(formattedBaseValue, formattedComparisonValue, { ignoreWhitespace: false })
      : diffLines(formattedBaseValue, formattedComparisonValue, { ignoreWhitespace: false });
  }, [baseValue, comparisonValue, diffMode]);
};

const hasLengthOne = (value: unknown): value is unknown[] => {
  return Array.isArray(value) && value.length === 1;
};

const formatDiffValue = (value: unknown, forceJson: boolean) => {
  const extractedValue = !forceJson && hasLengthOne(value) ? value[0] : value;

  if (value != null && (forceJson || typeof extractedValue === 'object')) {
    return { value: JSON.stringify(extractedValue, null, 2), isJson: true };
  }

  return { value: String(extractedValue ?? ''), isJson: false };
};

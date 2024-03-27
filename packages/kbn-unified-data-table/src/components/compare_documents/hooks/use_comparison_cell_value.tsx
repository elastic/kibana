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
import { diffChars, diffLines, diffWords } from 'diff';
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
  const comparisonBaseDocId = selectedDocs[0];
  const comparisonBaseDoc = useMemo(
    () => getDocById(comparisonBaseDocId)?.flattened,
    [comparisonBaseDocId, getDocById]
  );

  return useCallback(
    (innerProps: EuiDataGridCellValueElementProps) => {
      return (
        <InnerCellValue
          dataView={dataView}
          comparisonFields={comparisonFields}
          fieldColumnId={fieldColumnId}
          comparisonBaseDocId={comparisonBaseDocId}
          comparisonBaseDoc={comparisonBaseDoc}
          diffMode={diffMode}
          fieldFormats={fieldFormats}
          getDocById={getDocById}
          {...innerProps}
        />
      );
    },
    [
      comparisonBaseDoc,
      comparisonBaseDocId,
      comparisonFields,
      dataView,
      diffMode,
      fieldColumnId,
      fieldFormats,
      getDocById,
    ]
  );
};

interface InnerCellValueProps
  extends Omit<UseComparisonCellValueProps, 'selectedDocs'>,
    EuiDataGridCellValueElementProps {
  comparisonBaseDocId: string;
  comparisonBaseDoc: DataTableRecord['flattened'] | undefined;
}

const EMPTY_VALUE = '-';

const InnerCellValue = ({
  dataView,
  comparisonBaseDocId,
  comparisonBaseDoc,
  comparisonFields,
  diffMode,
  fieldColumnId,
  getDocById,
  fieldFormats,
  rowIndex,
  columnId,
  setCellProps,
}: InnerCellValueProps) => {
  const fieldName = comparisonFields[rowIndex];
  const field = useMemo(() => dataView.fields.getByName(fieldName), [dataView.fields, fieldName]);
  const doc = useMemo(() => getDocById(columnId), [columnId, getDocById]);
  const base = comparisonBaseDoc?.[fieldName];
  const comparison = doc?.flattened[fieldName];
  const diff = useDiff({ base, comparison, diffMode });

  useEffect(() => {
    if (columnId === comparisonBaseDocId) {
      setCellProps({ className: BASE_CELL_CLASS });
    } else if (diffMode !== 'basic') {
      setCellProps({ className: undefined });
    } else if (columnId !== fieldColumnId) {
      if (isEqual(base, comparison)) {
        setCellProps({ className: MATCH_CELL_CLASS });
      } else {
        setCellProps({ className: DIFF_CELL_CLASS });
      }
    }
  }, [base, columnId, comparison, comparisonBaseDocId, diffMode, fieldColumnId, setCellProps]);

  if (columnId === fieldColumnId) {
    return <FieldCellContent field={field} fieldName={fieldName} />;
  }

  if (!doc) {
    return <span className={CELL_CLASS}>{EMPTY_VALUE}</span>;
  }

  if (!diff) {
    return (
      <span
        className={CELL_CLASS}
        // formatFieldValue guarantees sanitized values
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: formatFieldValue(
            doc.flattened[fieldName],
            doc.raw,
            fieldFormats,
            dataView,
            dataView.getFieldByName(fieldName)
          ),
        }}
      />
    );
  }

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
          {change.value}
        </SegmentTag>
      ))}
    </span>
  );
};

const FieldCellContent = ({
  field,
  fieldName,
}: {
  field: DataViewField | undefined;
  fieldName: string;
}) => {
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

const useDiff = ({
  base,
  comparison,
  diffMode,
}: {
  base: unknown;
  comparison: unknown;
  diffMode: DocumentDiffMode | undefined;
}) => {
  const diff = useMemo(() => {
    if (!diffMode || diffMode === 'basic' || !base || !comparison) {
      return undefined;
    }

    const forceJson =
      (hasLengthOne(base) && !hasLengthOne(comparison)) ||
      (!hasLengthOne(base) && hasLengthOne(comparison));
    const baseValueString = getStringifiedValue(base, forceJson);
    const currentValueString = getStringifiedValue(comparison, forceJson);

    if (diffMode === 'chars') {
      return diffChars(baseValueString, currentValueString);
    }

    if (diffMode === 'words') {
      return diffWords(baseValueString, currentValueString, { ignoreWhitespace: false });
    }

    return diffLines(baseValueString, currentValueString, { ignoreWhitespace: false });
  }, [base, comparison, diffMode]);

  return diff;
};

const hasLengthOne = (value: unknown): value is unknown[] => {
  return Array.isArray(value) && value.length === 1;
};

const getStringifiedValue = (value: unknown, forceJson: boolean) => {
  const extractedValue = !forceJson && hasLengthOne(value) ? value[0] : value;

  if (forceJson || typeof extractedValue === 'object') {
    return JSON.stringify(extractedValue, null, 2);
  }

  return String(extractedValue ?? EMPTY_VALUE);
};

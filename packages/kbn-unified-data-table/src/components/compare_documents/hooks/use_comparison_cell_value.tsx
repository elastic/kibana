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
import { getFieldIconProps } from '@kbn/field-utils';
import { FieldIcon } from '@kbn/react-field';
import {
  AdditionalFieldGroups,
  getAllFallbackFields,
  getAssociatedSmartFieldsAsString,
  SmartFieldFallbackTooltip,
} from '@kbn/unified-field-list';
import classNames from 'classnames';
import { isEqual, memoize } from 'lodash';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CELL_CLASS } from '../../../utils/get_render_cell_value';
import type { DocumentDiffMode } from '../types';
import { calculateDiff, CalculateDiffProps, formatDiffValue } from './calculate_diff';
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
  selectedDocIds: string[];
  diffMode: DocumentDiffMode | undefined;
  fieldFormats: FieldFormatsStart;
  getDocById: (id: string) => DataTableRecord | undefined;
  additionalFieldGroups?: AdditionalFieldGroups;
}

export const useComparisonCellValue = ({
  dataView,
  comparisonFields,
  fieldColumnId,
  selectedDocIds,
  diffMode,
  fieldFormats,
  getDocById,
  additionalFieldGroups,
}: UseComparisonCellValueProps) => {
  const baseDocId = selectedDocIds[0];
  const baseDoc = useMemo(() => getDocById(baseDocId)?.flattened, [baseDocId, getDocById]);
  const [calculateDiffMemoized] = useState(() => createCalculateDiffMemoized());

  return useCallback(
    (props: EuiDataGridCellValueElementProps) => (
      <DiffProvider value={calculateDiffMemoized}>
        <CellValue
          dataView={dataView}
          comparisonFields={comparisonFields}
          fieldColumnId={fieldColumnId}
          baseDocId={baseDocId}
          baseDoc={baseDoc}
          diffMode={diffMode}
          fieldFormats={fieldFormats}
          getDocById={getDocById}
          additionalFieldGroups={additionalFieldGroups}
          {...props}
        />
      </DiffProvider>
    ),
    [
      additionalFieldGroups,
      baseDoc,
      baseDocId,
      calculateDiffMemoized,
      comparisonFields,
      dataView,
      diffMode,
      fieldColumnId,
      fieldFormats,
      getDocById,
    ]
  );
};

type CellValueProps = Omit<UseComparisonCellValueProps, 'selectedDocIds'> &
  EuiDataGridCellValueElementProps & {
    baseDocId: string;
    baseDoc: DataTableRecord['flattened'] | undefined;
    additionalFieldGroups?: AdditionalFieldGroups;
  };

const EMPTY_VALUE = '-';

const CellValue = (props: CellValueProps) => {
  const {
    dataView,
    comparisonFields,
    fieldColumnId,
    rowIndex,
    columnId,
    getDocById,
    additionalFieldGroups,
  } = props;
  const fieldName = comparisonFields[rowIndex];
  const field = useMemo(() => dataView.fields.getByName(fieldName), [dataView.fields, fieldName]);
  const comparisonDoc = useMemo(() => getDocById(columnId), [columnId, getDocById]);
  const allFallbackFields = useMemo(
    () => getAllFallbackFields(additionalFieldGroups),
    [additionalFieldGroups]
  );
  if (columnId === fieldColumnId) {
    return (
      <FieldCellValue
        field={field}
        fieldName={fieldName}
        additionalFieldGroups={additionalFieldGroups}
        allFallbackFields={allFallbackFields}
      />
    );
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

const FieldCellValue = ({
  field,
  fieldName,
  additionalFieldGroups,
  allFallbackFields,
}: FieldCellValueProps & {
  additionalFieldGroups?: AdditionalFieldGroups;
  allFallbackFields: string[]; // NOTE: Used purely as an optimisation to avoid looking up Smart Field names unless needed.
}) => {
  const isDerivedAsPartOfSmartField = allFallbackFields.includes(fieldName);
  const associatedSmartFields = useMemo(
    () =>
      isDerivedAsPartOfSmartField
        ? getAssociatedSmartFieldsAsString(fieldName, additionalFieldGroups)
        : '',
    [isDerivedAsPartOfSmartField, fieldName, additionalFieldGroups]
  );

  return (
    <EuiFlexGroup responsive={false} gutterSize="s">
      {field && (
        <EuiFlexItem grow={false}>
          <FieldIcon {...getFieldIconProps(field)} />
        </EuiFlexItem>
      )}
      <EuiFlexItem>
        <EuiText
          size="relative"
          className={FIELD_NAME_CLASS}
          data-test-subj="unifiedDataTableComparisonFieldName"
        >
          {field?.displayName ?? fieldName}
          {isDerivedAsPartOfSmartField ? (
            <>
              {' '}
              <SmartFieldFallbackTooltip associatedSmartFields={associatedSmartFields} />
            </>
          ) : null}
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

const DiffCellValueAdvanced = ({ diffMode, ...props }: CalculateDiffProps) => {
  const diff = useDiff({ diffMode, ...props });
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

// EuiDataGrid remounts cells often due to virtualization, e.g. on init to calculate cell sizes
// and while scrolling, so React memoization is not effective here. Instead we memoize the diff
// results in the comparison to avoid recalculating them frequently.
const createCalculateDiffMemoized = (): typeof calculateDiff => {
  const calculateDiffMemoized = memoize((diffMode: CalculateDiffProps['diffMode']) => {
    return memoize((baseValue: CalculateDiffProps['baseValue']) => {
      return memoize((comparisonValue: CalculateDiffProps['comparisonValue']) => {
        return calculateDiff({ diffMode, baseValue, comparisonValue });
      });
    });
  });

  return ({ diffMode, baseValue, comparisonValue }: CalculateDiffProps) => {
    return calculateDiffMemoized(diffMode)(baseValue)(comparisonValue);
  };
};

const DiffContext = createContext(calculateDiff);
const DiffProvider = DiffContext.Provider;

const useDiff = (props: CalculateDiffProps) => {
  const calculateDiffMemoized = useContext(DiffContext);
  return calculateDiffMemoized(props);
};

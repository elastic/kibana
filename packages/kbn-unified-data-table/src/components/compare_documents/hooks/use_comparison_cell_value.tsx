/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiDataGridCellValueElementProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  tint,
  useEuiBackgroundColor,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { formatFieldValue, getFieldTypeName } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { FieldIcon } from '@kbn/react-field';
import { euiThemeVars } from '@kbn/ui-theme';
import { Change, diffChars, diffLines, diffWords } from 'diff';
import { isEqual } from 'lodash';
import React, { useCallback, useEffect, useMemo } from 'react';
import { CELL_CLASS } from '../../../utils/get_render_cell_value';
import type { DocumentDiffMode } from '../types';

export interface UseComparisonCellValueProps {
  dataView: DataView;
  comparisonFields: string[];
  fieldColumnId: string;
  selectedDocs: string[];
  showDiff: boolean | undefined;
  diffMode: DocumentDiffMode | undefined;
  showDiffDecorations: boolean | undefined;
  fieldFormats: FieldFormatsStart;
  getDocById: (id: string) => DataTableRecord | undefined;
}

const matchingCellCss = css`
  .unifiedDataTable__cellValue {
    &,
    & * {
      color: ${euiThemeVars.euiColorSuccessText} !important;
    }
  }
`;

const differentCellCss = css`
  .unifiedDataTable__cellValue {
    &,
    & * {
      color: ${euiThemeVars.euiColorDangerText} !important;
    }
  }
`;

export const useComparisonCellValue = ({
  dataView,
  comparisonFields,
  fieldColumnId,
  selectedDocs,
  showDiff,
  diffMode,
  showDiffDecorations,
  fieldFormats,
  getDocById,
}: UseComparisonCellValueProps) => {
  const comparisonBaseDocId = selectedDocs[0];
  const comparisonBaseDoc = useMemo(
    () => getDocById(comparisonBaseDocId)?.flattened,
    [comparisonBaseDocId, getDocById]
  );
  const matchBackgroundColor = useEuiBackgroundColor('success');
  const diffBackgroundColor = useEuiBackgroundColor('danger');
  const baseDocCellCss = css`
    background-color: ${useEuiBackgroundColor('success', { method: 'transparent' })};
  `;

  const ComparisonCellValue = useCallback(
    (innerProps: EuiDataGridCellValueElementProps) => {
      return (
        <InnerCellValue
          dataView={dataView}
          comparisonFields={comparisonFields}
          fieldColumnId={fieldColumnId}
          comparisonBaseDocId={comparisonBaseDocId}
          comparisonBaseDoc={comparisonBaseDoc}
          showDiff={showDiff}
          diffMode={diffMode}
          showDiffDecorations={showDiffDecorations}
          fieldFormats={fieldFormats}
          getDocById={getDocById}
          baseDocCellCss={baseDocCellCss}
          matchBackgroundColor={matchBackgroundColor}
          diffBackgroundColor={diffBackgroundColor}
          {...innerProps}
        />
      );
    },
    [
      baseDocCellCss,
      comparisonBaseDoc,
      comparisonBaseDocId,
      comparisonFields,
      dataView,
      diffBackgroundColor,
      diffMode,
      fieldColumnId,
      fieldFormats,
      getDocById,
      matchBackgroundColor,
      showDiff,
      showDiffDecorations,
    ]
  );

  return ComparisonCellValue;
};

interface InnerCellValueProps
  extends Omit<UseComparisonCellValueProps, 'selectedDocs'>,
    EuiDataGridCellValueElementProps {
  comparisonBaseDocId: string;
  comparisonBaseDoc: DataTableRecord['flattened'] | undefined;
  baseDocCellCss: ReturnType<typeof css>;
  matchBackgroundColor: string;
  diffBackgroundColor: string;
}

const EMPTY_VALUE = '-';

const indicatorCss = css`
  position: absolute;
  width: ${euiThemeVars.euiSizeS};
  height: 100%;
  margin-left: calc(-${euiThemeVars.euiSizeS} - calc(${euiThemeVars.euiSizeXS} / 2));
  text-align: center;
  line-height: ${euiThemeVars.euiFontSizeM};
  font-weight: ${euiThemeVars.euiFontWeightMedium};
`;

const matchIndicatorCss = css`
  &:before {
    content: '+';
    ${indicatorCss}
    background-color: ${euiThemeVars.euiColorSuccess};
    color: ${euiThemeVars.euiColorLightestShade};
  }
`;

const diffIndicatorCss = css`
  &:before {
    content: '-';
    ${indicatorCss}
    background-color: ${tint(euiThemeVars.euiColorDanger, 0.25)};
    color: ${euiThemeVars.euiColorLightestShade};
  }
`;

const InnerCellValue = ({
  dataView,
  comparisonBaseDocId,
  comparisonBaseDoc,
  comparisonFields,
  showDiff,
  diffMode,
  showDiffDecorations,
  fieldColumnId,
  getDocById,
  baseDocCellCss,
  matchBackgroundColor,
  diffBackgroundColor,
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
  const diff = useDiff({ base, comparison, showDiff, diffMode });

  useEffect(() => {
    if (!showDiff || diffMode !== 'basic') {
      setCellProps({ css: undefined });
      return;
    }

    if (columnId === comparisonBaseDocId) {
      setCellProps({ css: baseDocCellCss });
    } else if (columnId !== fieldColumnId) {
      if (isEqual(base, comparison)) {
        setCellProps({ css: matchingCellCss });
      } else {
        setCellProps({ css: differentCellCss });
      }
    }
  }, [
    base,
    baseDocCellCss,
    columnId,
    comparison,
    comparisonBaseDocId,
    diffMode,
    fieldColumnId,
    setCellProps,
    showDiff,
  ]);

  if (columnId === fieldColumnId) {
    return <FieldColumn field={field} fieldName={fieldName} />;
  }

  if (!doc) {
    return <>{EMPTY_VALUE}</>;
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

  const matchCss = css`
    background-color: ${matchBackgroundColor};
    color: ${euiThemeVars.euiColorSuccessText};
  `;
  const diffCss = css`
    background-color: ${diffBackgroundColor};
    color: ${euiThemeVars.euiColorDangerText};
  `;

  return (
    <span className={CELL_CLASS}>
      {diff.map((change, i) => (
        <DiffSegment
          key={`segment-${i}`}
          change={change}
          diffMode={diffMode}
          showDiffDecorations={showDiffDecorations}
          matchCss={matchCss}
          diffCss={diffCss}
        />
      ))}
    </span>
  );
};

const FieldColumn = ({
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
        <EuiText
          size="relative"
          css={css`
            font-weight: ${euiThemeVars.euiFontWeightSemiBold};
          `}
        >
          {field?.displayName ?? fieldName}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const DiffSegment = ({
  change,
  diffMode,
  showDiffDecorations,
  matchCss,
  diffCss,
}: {
  change: Change;
  diffMode: DocumentDiffMode | undefined;
  showDiffDecorations: boolean | undefined;
  matchCss: ReturnType<typeof css>;
  diffCss: ReturnType<typeof css>;
}) => {
  const SegmentTag = diffMode === 'lines' ? 'div' : 'span';

  const highlightCss = useMemo(
    () => (change.added ? matchCss : change.removed ? diffCss : undefined),
    [change.added, change.removed, diffCss, matchCss]
  );

  const paddingCss = useMemo(() => {
    if (diffMode === 'lines') {
      return css`
        padding-left: calc(${euiThemeVars.euiSizeXS} / 2);
      `;
    }
  }, [diffMode]);

  const decorationCss = useMemo(() => {
    if (!showDiffDecorations) {
      return undefined;
    }

    if (diffMode === 'lines') {
      if (change.added) {
        return matchIndicatorCss;
      } else if (change.removed) {
        return diffIndicatorCss;
      }
    } else {
      if (change.added) {
        return css`
          text-decoration: underline;
        `;
      } else if (change.removed) {
        return css`
          text-decoration: line-through;
        `;
      }
    }
  }, [change.added, change.removed, diffMode, showDiffDecorations]);

  return (
    <SegmentTag
      css={[
        css`
          position: relative;
        `,
        highlightCss,
        paddingCss,
        decorationCss,
      ]}
    >
      {change.value}
    </SegmentTag>
  );
};

const useDiff = ({
  base,
  comparison,
  showDiff,
  diffMode,
}: {
  base: unknown;
  comparison: unknown;
  showDiff: boolean | undefined;
  diffMode: DocumentDiffMode | undefined;
}) => {
  const diff = useMemo(() => {
    if (!showDiff || diffMode === 'basic' || !base || !comparison) {
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
  }, [base, comparison, diffMode, showDiff]);

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

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
import { formatFieldValue, getFieldTypeName } from '@kbn/discover-utils';
import { DataTableRecord } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { FieldIcon } from '@kbn/react-field';
import { euiThemeVars } from '@kbn/ui-theme';
import { diffChars, diffLines, diffWords } from 'diff';
import { isEqual } from 'lodash';
import React, { useCallback, useEffect, useMemo } from 'react';
import { CELL_CLASS } from '../../../utils/get_render_cell_value';

export interface UseComparisonCellValueProps {
  dataView: any;
  comparisonFields: string[];
  fieldsColumnId: string;
  selectedDocs: string[];
  showDiff: boolean | undefined;
  diffMode: 'basic' | 'chars' | 'words' | 'lines' | undefined;
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

export const useComparisonCellValue = (props: UseComparisonCellValueProps) => {
  const {
    dataView,
    comparisonFields,
    fieldsColumnId,
    selectedDocs,
    showDiff,
    diffMode,
    showDiffDecorations,
    fieldFormats,
    getDocById,
  } = props;

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
          fieldsColumnId={fieldsColumnId}
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
      fieldFormats,
      fieldsColumnId,
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

const InnerCellValue = ({
  dataView,
  comparisonBaseDocId,
  comparisonBaseDoc,
  comparisonFields,
  showDiff,
  diffMode,
  showDiffDecorations,
  fieldsColumnId,
  getDocById,
  baseDocCellCss,
  matchBackgroundColor,
  diffBackgroundColor,
  fieldFormats,
  ...props
}: InnerCellValueProps) => {
  const { rowIndex, columnId, setCellProps } = props;
  const fieldName = comparisonFields[rowIndex];
  const field = useMemo(() => dataView.fields.getByName(fieldName), [dataView.fields, fieldName]);
  const doc = useMemo(() => getDocById(columnId), [columnId, getDocById]);

  useEffect(() => {
    if (!showDiff || diffMode !== 'basic') {
      setCellProps({ css: undefined });
      return;
    }

    if (columnId === comparisonBaseDocId) {
      setCellProps({ css: baseDocCellCss });
    } else if (columnId !== fieldsColumnId) {
      const baseValue = comparisonBaseDoc?.[fieldName];
      const currentValue = doc?.flattened[fieldName];

      if (isEqual(baseValue, currentValue)) {
        setCellProps({ css: matchingCellCss });
      } else {
        setCellProps({ css: differentCellCss });
      }
    }
  }, [
    baseDocCellCss,
    columnId,
    comparisonBaseDoc,
    comparisonBaseDocId,
    diffMode,
    doc?.flattened,
    fieldName,
    fieldsColumnId,
    setCellProps,
    showDiff,
  ]);

  if (columnId === fieldsColumnId) {
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
  }

  if (!doc) {
    return <>-</>;
  }

  const baseValue = comparisonBaseDoc?.[fieldName];
  const currentValue = doc?.flattened[fieldName];

  if (showDiff && diffMode !== 'basic' && baseValue && currentValue) {
    const hasLengthOne = (value: unknown): value is unknown[] => {
      return Array.isArray(value) && value.length === 1;
    };
    const getStringifiedValue = (value: unknown, forceJson: boolean) => {
      const extractedValue = !forceJson && hasLengthOne(value) ? value[0] : value;
      if (forceJson || typeof extractedValue === 'object') {
        return JSON.stringify(extractedValue, null, 2);
      }
      return String(extractedValue ?? '-');
    };
    const forceJson =
      (hasLengthOne(baseValue) && !hasLengthOne(currentValue)) ||
      (!hasLengthOne(baseValue) && hasLengthOne(currentValue));
    const baseValueString = getStringifiedValue(baseValue, forceJson);
    const currentValueString = getStringifiedValue(currentValue, forceJson);
    const diff =
      diffMode === 'chars'
        ? diffChars(baseValueString, currentValueString)
        : diffMode === 'words'
        ? diffWords(baseValueString, currentValueString)
        : diffLines(baseValueString, currentValueString);
    const indicatorCss = css`
      position: absolute;
      width: ${euiThemeVars.euiSizeS};
      height: 100%;
      margin-left: calc(-${euiThemeVars.euiSizeS} - calc(${euiThemeVars.euiSizeXS} / 2));
      text-align: center;
      line-height: ${euiThemeVars.euiFontSizeM};
      font-weight: ${euiThemeVars.euiFontWeightMedium};
    `;
    const matchCss = css`
      background-color: ${matchBackgroundColor};
      color: ${euiThemeVars.euiColorSuccessText};
    `;
    const matchIndicatorCss = css`
      &:before {
        content: '+';
        ${indicatorCss}
        background-color: ${euiThemeVars.euiColorSuccess};
        color: ${euiThemeVars.euiColorLightestShade};
      }
    `;
    const diffCss = css`
      background-color: ${diffBackgroundColor};
      color: ${euiThemeVars.euiColorDangerText};
    `;
    const diffIndicatorCss = css`
      &:before {
        content: '-';
        ${indicatorCss}
        background-color: ${tint(euiThemeVars.euiColorDanger, 0.25)};
        color: ${euiThemeVars.euiColorLightestShade};
      }
    `;
    const SegmentTag: keyof JSX.IntrinsicElements = diffMode === 'lines' ? 'div' : 'span';

    return (
      <div className={CELL_CLASS}>
        {diff.map((part, i) => (
          <SegmentTag
            key={`segment-${i}`}
            css={[
              css`
                position: relative;
              `,
              part.added ? matchCss : part.removed ? diffCss : undefined,
              diffMode === 'lines'
                ? css`
                    padding-left: calc(${euiThemeVars.euiSizeXS} / 2);
                  `
                : undefined,
              showDiffDecorations
                ? diffMode === 'lines'
                  ? part.added
                    ? matchIndicatorCss
                    : part.removed
                    ? diffIndicatorCss
                    : undefined
                  : part.added
                  ? css`
                      text-decoration: underline;
                    `
                  : part.removed
                  ? css`
                      text-decoration: line-through;
                    `
                  : undefined
                : undefined,
            ]}
          >
            {part.value}
          </SegmentTag>
        ))}
      </div>
    );
  }

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
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridColumnVisibility,
  EuiDataGridInMemory,
  EuiDataGridRowHeightsOptions,
  EuiDataGridSchemaDetector,
  EuiDataGridToolBarVisibilityOptions,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  tint,
  useEuiBackgroundColor,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { DataView } from '@kbn/data-views-plugin/common';
import { formatFieldValue, getFieldTypeName } from '@kbn/discover-utils';
import { DataTableRecord } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { FieldIcon } from '@kbn/react-field';
import { euiThemeVars } from '@kbn/ui-theme';
import { diffChars, diffLines, diffWords } from 'diff';
import { isEqual } from 'lodash';
import React, { useCallback, useEffect, useMemo } from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { GRID_STYLE } from '../../constants';
import { CELL_CLASS } from '../../utils/get_render_cell_value';
import { ComparisonControls } from './comparison_controls';
import { useComparisonColumns } from './hooks/use_comparison_columns';
import { useComparisonFields } from './hooks/use_comparison_fields';

export interface CompareDocumentsProps {
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

const CompareDocuments = ({
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
  const [showDiff, setShowDiff] = useLocalStorage(`${consumer}:dataGridShowDiff`, true);
  const [showAllFields, setShowAllFields] = useLocalStorage(
    `${consumer}:dataGridShowAllFields`,
    false
  );
  const [diffMode, setDiffMode] = useLocalStorage<'basic' | 'chars' | 'words' | 'lines'>(
    `${consumer}:dataGridDiffMode`,
    'basic'
  );
  const [showDiffDecorations, setShowDiffDecorations] = useLocalStorage(
    `${consumer}:dataGridShowDiffDecorations`,
    true
  );
  const fieldsColumnId = useGeneratedHtmlId({ prefix: 'fields' });
  const comparisonColumns = useComparisonColumns({
    fieldsColumnId,
    selectedDocs,
    getDocById,
    setSelectedDocs,
  });
  const comparisonInMemory: EuiDataGridInMemory = useMemo(() => ({ level: 'sorting' }), []);
  const comparisonColumnVisibility: EuiDataGridColumnVisibility = useMemo(
    () => ({
      visibleColumns: comparisonColumns.map(({ id }) => id),
      setVisibleColumns: () => {},
    }),
    [comparisonColumns]
  );
  const comparisonRowHeight: EuiDataGridRowHeightsOptions = useMemo(
    () => ({ defaultHeight: 'auto' }),
    []
  );
  const comparisonFields = useComparisonFields({
    dataView,
    selectedFieldNames,
    showAllFields: Boolean(forceShowAllFields || showAllFields),
  });
  const comparisonRowCount = useMemo(() => comparisonFields.length, [comparisonFields.length]);
  const comparisonToolbarVisibility: EuiDataGridToolBarVisibilityOptions = useMemo(
    () => ({
      showColumnSelector: false,
      showDisplaySelector: {
        allowDensity: false,
      },
      additionalControls: (
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
    }),
    [
      forceShowAllFields,
      diffMode,
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
  const renderComparisonCellValue = useCallback(
    function ComparisonCellValue(props: EuiDataGridCellValueElementProps) {
      const { rowIndex, columnId, setCellProps } = props;
      const fieldName = comparisonFields[rowIndex];
      const field = useMemo(() => dataView.fields.getByName(fieldName), [fieldName]);
      const doc = useMemo(() => getDocById(columnId), [columnId]);

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
      }, [columnId, doc?.flattened, fieldName, setCellProps]);

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
        return '-';
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
            {diff.map((part) => (
              <SegmentTag
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
    },
    [
      comparisonFields,
      fieldsColumnId,
      comparisonBaseDoc,
      showDiff,
      diffMode,
      fieldFormats,
      dataView,
      getDocById,
      comparisonBaseDocId,
      baseDocCellCss,
      matchingCellCss,
      differentCellCss,
      matchBackgroundColor,
      diffBackgroundColor,
      showDiffDecorations,
    ]
  );

  return (
    <EuiDataGrid
      aria-describedby={ariaDescribedBy}
      aria-labelledby={ariaLabelledBy}
      columns={comparisonColumns}
      columnVisibility={comparisonColumnVisibility}
      data-test-subj="comparisonTable"
      renderCellValue={renderComparisonCellValue}
      rowCount={comparisonRowCount}
      schemaDetectors={schemaDetectors}
      toolbarVisibility={comparisonToolbarVisibility}
      inMemory={comparisonInMemory}
      gridStyle={GRID_STYLE}
      rowHeightsOptions={comparisonRowHeight}
    />
  );
};

// eslint-disable-next-line import/no-default-export
export default CompareDocuments;

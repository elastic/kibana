/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, type ReactNode } from 'react';
import { css } from '@emotion/react';
import type {
  DataTableRecord,
  FormattedHit,
  ShouldShowFieldInTableHandler,
} from '@kbn/discover-utils/src/types';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import {
  canTruncateFieldValue,
  formatFieldValueReact,
  formatHitReact,
  MAX_RENDERED_FIELD_VALUE_LENGTH,
  truncateFieldValue,
} from '@kbn/discover-utils';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  euiLineHeightFromBaseline,
  type UseEuiTheme,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import classnames from 'classnames';
import type { DataSource } from '@kbn/data-source';
import { getDataViewFieldFromDataSource } from '@kbn/discover-utils';
import { getInnerColumns } from '../utils/columns';

const CELL_CLASS = 'unifiedDataTable__cellValue';
const SKIP_NULLISH_VALUES_FORMAT_OPTIONS = { skipNullishValues: true };

export function SourceDocument({
  useTopLevelObjectColumns,
  row,
  columnId,
  dataView,
  shouldShowFieldHandler,
  maxEntries,
  fieldFormats,
  dataTestSubj = 'discoverCellDescriptionList',
  className,
  isCompressed = true,
  dataSource,
  isInteractive = true,
}: {
  useTopLevelObjectColumns: boolean;
  row: DataTableRecord;
  columnId: string;
  dataView: DataView;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
  maxEntries: number;
  fieldFormats: FieldFormatsStart;
  dataTestSubj?: string;
  className?: string;
  isCompressed?: boolean;
  dataSource: DataSource | undefined;
  isInteractive?: boolean;
}) {
  const styles = useMemoCss(componentStyles);
  const isEsql = dataSource?.kind === 'esql';
  const pairs: FormattedHit = useTopLevelObjectColumns
    ? getTopLevelObjectPairsReact(
        row,
        columnId,
        dataView,
        shouldShowFieldHandler,
        fieldFormats,
        dataSource,
        isEsql,
        isInteractive,
        maxEntries
      )
    : formatHitReact(row, dataView, shouldShowFieldHandler, maxEntries, fieldFormats, dataSource, {
        ...(isEsql ? SKIP_NULLISH_VALUES_FORMAT_OPTIONS : undefined),
        isInteractive,
      });

  const renderedPairs: ReactNode[] = [];

  for (const [fieldDisplayName, value] of pairs) {
    renderedPairs.push(
      <Fragment key={fieldDisplayName}>
        <EuiDescriptionListTitle className="unifiedDataTable__descriptionListTitle">
          {fieldDisplayName}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription className="unifiedDataTable__descriptionListDescription">
          {value}
        </EuiDescriptionListDescription>
      </Fragment>
    );
  }

  if (isEsql && renderedPairs.length === 0) {
    return <span className={classnames(CELL_CLASS, className)}>—</span>;
  }

  return (
    <EuiDescriptionList
      type="inline"
      compressed={isCompressed}
      className={classnames('unifiedDataTable__descriptionList', CELL_CLASS, className)}
      css={styles.descriptionList}
      data-test-subj={dataTestSubj}
    >
      {renderedPairs}
    </EuiDescriptionList>
  );
}

type UnformattedTopLevelObjectPair = [
  fieldDisplayName: string,
  values: unknown[],
  fieldName: string
];

/**
 * Helper function to show top level objects
 * this is used for legacy stuff like displaying products of our ecommerce dataset
 */
function getTopLevelObjectPairsReact(
  row: DataTableRecord,
  columnId: string,
  dataView: DataView,
  shouldShowFieldHandler: ShouldShowFieldInTableHandler,
  fieldFormats: FieldFormatsStart,
  dataSource: DataSource | undefined,
  skipNullishValues: boolean,
  isInteractive: boolean,
  maxEntries: number
): FormattedHit {
  const innerColumns = getInnerColumns(row.raw.fields as Record<string, unknown[]>, columnId);
  // Put the most important fields first
  const highlights: Record<string, unknown> = (row.raw.highlight as Record<string, unknown>) ?? {};
  const highlightPairs: UnformattedTopLevelObjectPair[] = [];
  const sourcePairs: UnformattedTopLevelObjectPair[] = [];
  Object.entries(innerColumns).forEach(([key, values]) => {
    if (skipNullishValues && (row.flattened[key] ?? null) === null) {
      return;
    }

    const displayKey = dataView.fields.getByName
      ? dataView.fields.getByName(key)?.displayName
      : undefined;
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    if (displayKey) {
      if (shouldShowFieldHandler(displayKey)) {
        pairs.push([displayKey, values, key]);
      }
    } else {
      pairs.push([key, values, key]);
    }
  });

  // Format only the values of pairs which will be rendered
  return [...highlightPairs, ...sourcePairs]
    .slice(0, maxEntries)
    .map(([displayKey, values, key]): FormattedHit[number] => {
      const subField = getDataViewFieldFromDataSource({ dataView, dataSource, fieldName: key });
      // All values of a pair share one length budget, the cut value is formatted from its original to keep highlights
      const { value: truncatedValues } = truncateFieldValue(
        values,
        canTruncateFieldValue({ fieldFormats, dataView, field: subField })
          ? MAX_RENDERED_FIELD_VALUE_LENGTH
          : undefined
      );
      const shownValues = Array.isArray(truncatedValues) ? truncatedValues : values;
      const hasHiddenValues =
        shownValues.length < values.length &&
        shownValues[shownValues.length - 1] === values[shownValues.length - 1];
      // Join ReactNode values with ', ' separator, using keyed Fragments to avoid React warnings
      const formatted: ReactNode[] = shownValues.map((shownValue: unknown, idx) => (
        <Fragment key={`${key}-${idx}`}>
          {idx > 0 ? ', ' : null}
          {formatFieldValueReact({
            value: values[idx],
            hit: row.raw,
            fieldFormats,
            dataView,
            field: subField,
            options: { isInteractive },
            maxDisplayLength:
              typeof shownValue === 'string' && shownValue !== values[idx]
                ? shownValue.length
                : undefined,
          })}
        </Fragment>
      ));

      if (hasHiddenValues) {
        formatted.push('…');
      }

      return [displayKey, formatted, key];
    });
}

// eslint-disable-next-line import/no-default-export
export default SourceDocument;

const componentStyles = {
  descriptionList: ({ euiTheme }: UseEuiTheme) =>
    css({
      // force the content truncation when "Body cell lines: 1" row height setting is active
      '.euiDataGridRowCell__content--defaultHeight &': {
        WebkitLineClamp: 1,
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical',
        height: '100%',
        overflow: 'hidden',
      },

      // Following guidelines for CSS-in-JS - styles for high granularity components should be assigned to a parent and targeting classes of repeating children
      '.unifiedDataTable__descriptionListTitle': {
        marginInline: `0 ${euiTheme.size.s}`,
        paddingInline: 0,
        background: 'transparent',
        fontWeight: euiTheme.font.weight.bold,
        lineHeight: 'inherit', // Required for EuiDataGrid lineCount to work correctly
        display: 'inline-block',
      },

      '.unifiedDataTable__descriptionListDescription': {
        marginInline: `0 ${euiTheme.size.s}`,
        paddingInline: 0,
        wordBreak: 'break-all',
        whiteSpace: 'normal',
        lineHeight: 'inherit', // Required for EuiDataGrid lineCount to work correctly

        // Special handling for images coming from the image field formatter
        '& img': {
          // Align the images vertically centered with the text
          verticalAlign: 'middle',
          // !important is required to overwrite the max-height on the element from the field formatter
          // historically we used lineHeightFromBaseline(2) here, but the smallest euiLineHeightFromBaseline was too large
          maxHeight: `${euiLineHeightFromBaseline('xs', euiTheme)} !important`,
          // An arbitrary amount of width we don't want to go over, to not have very wide images.
          // For most width-height-ratios that will never be hit, because we'd usually limit
          // it by the way smaller height. But images with very large width and very small height
          // might be limited by that.
          maxWidth: `calc(${euiTheme.size.xxl} * 12.5) !important`,
        },
      },
    }),
};

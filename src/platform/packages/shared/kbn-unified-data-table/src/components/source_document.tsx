/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import { css } from '@emotion/react';
import type {
  DataTableRecord,
  EsHitRecord,
  FormattedHit,
  ShouldShowFieldInTableHandler,
} from '@kbn/discover-utils/src/types';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { formatFieldValue, formatHit } from '@kbn/discover-utils';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  euiLineHeightFromBaseline,
  type UseEuiTheme,
} from '@elastic/eui';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import classnames from 'classnames';
import { getInnerColumns } from '../utils/columns';

const CELL_CLASS = 'unifiedDataTable__cellValue';

export function SourceDocument({
  useTopLevelObjectColumns,
  row,
  columnId,
  dataView,
  shouldShowFieldHandler,
  maxEntries,
  isPlainRecord,
  fieldFormats,
  dataTestSubj = 'discoverCellDescriptionList',
  className,
  isCompressed = true,
}: {
  useTopLevelObjectColumns: boolean;
  row: DataTableRecord;
  columnId: string;
  dataView: DataView;
  shouldShowFieldHandler: ShouldShowFieldInTableHandler;
  maxEntries: number;
  isPlainRecord?: boolean;
  fieldFormats: FieldFormatsStart;
  dataTestSubj?: string;
  className?: string;
  isCompressed?: boolean;
}) {
  const styles = useMemoCss(componentStyles);
  const pairs: FormattedHit = useTopLevelObjectColumns
    ? getTopLevelObjectPairs(
        row.raw,
        columnId,
        dataView,
        shouldShowFieldHandler,
        fieldFormats
      ).slice(0, maxEntries)
    : formatHit(row, dataView, shouldShowFieldHandler, maxEntries, fieldFormats);

  return (
    <EuiDescriptionList
      type="inline"
      compressed={isCompressed}
      className={classnames('unifiedDataTable__descriptionList', CELL_CLASS, className)}
      css={styles.descriptionList}
      data-test-subj={dataTestSubj}
    >
      {pairs.map(([fieldDisplayName, value, fieldName]) => {
        // temporary solution for text based mode. As there are a lot of unsupported fields we want to
        // hide the empty one from the Document view
        if (isPlainRecord && fieldName && (row.flattened[fieldName] ?? null) === null) return null;
        return (
          <Fragment key={fieldDisplayName}>
            <EuiDescriptionListTitle className="unifiedDataTable__descriptionListTitle">
              {fieldDisplayName}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription
              className="unifiedDataTable__descriptionListDescription"
              dangerouslySetInnerHTML={{ __html: value }}
            />
          </Fragment>
        );
      })}
    </EuiDescriptionList>
  );
}

/**
 * Helper function to show top level objects
 * this is used for legacy stuff like displaying products of our ecommerce dataset
 */
function getTopLevelObjectPairs(
  row: EsHitRecord,
  columnId: string,
  dataView: DataView,
  shouldShowFieldHandler: ShouldShowFieldInTableHandler,
  fieldFormats: FieldFormatsStart
) {
  const innerColumns = getInnerColumns(row.fields as Record<string, unknown[]>, columnId);
  // Put the most important fields first
  const highlights: Record<string, unknown> = (row.highlight as Record<string, unknown>) ?? {};
  const highlightPairs: FormattedHit = [];
  const sourcePairs: FormattedHit = [];
  Object.entries(innerColumns).forEach(([key, values]) => {
    const subField = dataView.getFieldByName(key);
    const displayKey = dataView.fields.getByName
      ? dataView.fields.getByName(key)?.displayName
      : undefined;
    const formatted = values
      .map((value: unknown) => formatFieldValue(value, row, fieldFormats, dataView, subField))
      .join(', ');
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    if (displayKey) {
      if (shouldShowFieldHandler(displayKey)) {
        pairs.push([displayKey, formatted, key]);
      }
    } else {
      pairs.push([key, formatted, key]);
    }
  });
  return [...highlightPairs, ...sourcePairs];
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

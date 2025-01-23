/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment } from 'react';
import type {
  DataTableRecord,
  EsHitRecord,
  FormattedHit,
  ShouldShowFieldInTableHandler,
} from '@kbn/discover-utils/src/types';
import { css } from '@emotion/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { formatHit } from '@kbn/discover-utils';
import classnames from 'classnames';
import { getInnerColumns } from '../utils/columns';

const CELL_CLASS = 'unifiedDataTable__cellValue';

const descriptionListCss = css`
  text-align: start;

  & .unifiedDataTable__descriptionListTitle {
    // as in eui
    display: inline;
    overflow-wrap: break-word !important;
    word-break: break-word;
    margin-block: 0;
    padding-block: 1px;
    font-size: 1rem;

    // custom
    margin-inline: 0 0;
    padding-inline: 0;
    background: transparent;
    font-weight: 700;
    line-height: inherit; // Required for EuiDataGrid lineCount to work correctly
  }

  & .unifiedDataTable__descriptionListDescription {
    // as in eui
    display: inline;
    font-size: 1rem;

    // custom
    margin-inline: 8px 8px;
    padding-inline: 0;
    word-break: break-all;
    white-space: normal;
    line-height: inherit; // Required for EuiDataGrid lineCount to work correctly

    // Special handling for images coming from the image field formatter
    img {
      // Align the images vertically centered with the text
      vertical-align: middle;
      // Set the maximum height to the line-height. The used function is the same
      // function used to calculate the line-height for the EuiDescriptionList Description.
      // !important is required to overwrite the max-height on the element from the field formatter
      max-height: 1rem !important;
      // An arbitrary amount of width we don't want to go over, to not have very wide images.
      // For most width-height-ratios that will never be hit, because we'd usually limit
      // it by the way smaller height. But images with very large width and very small height
      // might be limited by that.
      max-width: 500px !important;
    }
  }

  &.unifiedDataTable__descriptionList--compressed {
    & .unifiedDataTable__descriptionListTitle {
      padding-block: 0;
      font-size: 0.8571rem;
    }

    & .unifiedDataTable__descriptionListDescription {
      font-size: 0.8571rem;
    }
  }

  // force the content truncation when "Single line" row height setting is active
  .euiDataGridRowCell__content--defaultHeight & {
    -webkit-line-clamp: 1;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    height: 100%;
    overflow: hidden;
  }
`;

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
  const pairs: FormattedHit = useTopLevelObjectColumns
    ? getTopLevelObjectPairs(row.raw, columnId, dataView, shouldShowFieldHandler).slice(
        0,
        maxEntries
      )
    : formatHit(row, dataView, shouldShowFieldHandler, maxEntries, fieldFormats);

  return (
    <dl
      className={classnames('unifiedDataTable__descriptionList', CELL_CLASS, className, {
        'unifiedDataTable__descriptionList--compressed': isCompressed,
      })}
      data-test-subj={dataTestSubj}
      css={descriptionListCss}
    >
      {pairs.map(([fieldDisplayName, value, fieldName]) => {
        // temporary solution for text based mode. As there are a lot of unsupported fields we want to
        // hide the empty one from the Document view
        if (isPlainRecord && fieldName && (row.flattened[fieldName] ?? null) === null) return null;
        return (
          <Fragment key={fieldDisplayName}>
            <dt className="unifiedDataTable__descriptionListTitle">{fieldDisplayName}</dt>
            <dd
              className="unifiedDataTable__descriptionListDescription"
              dangerouslySetInnerHTML={{ __html: value }} // eslint-disable-line react/no-danger
            />
          </Fragment>
        );
      })}
    </dl>
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
  shouldShowFieldHandler: ShouldShowFieldInTableHandler
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
    const formatter = subField
      ? dataView.getFormatterForField(subField)
      : { convert: (v: unknown, ...rest: unknown[]) => String(v) };
    const formatted = values
      .map((val: unknown) =>
        formatter.convert(val, 'html', {
          field: subField,
          hit: row,
        })
      )
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment } from 'react';
import type {
  DataTableRecord,
  EsHitRecord,
  FormattedHit,
  ShouldShowFieldInTableHandler,
} from '@kbn/discover-utils/src/types';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { formatHit } from '@kbn/discover-utils';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
} from '@elastic/eui';
import { JSONTree } from '@kbn/json-tree';
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
  isDarkMode,
  isSingleRow,
  onTreeExpand,
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
  isDarkMode?: boolean;
  isSingleRow?: boolean;
  onTreeExpand?: () => void;
}) {
  const pairs: FormattedHit = useTopLevelObjectColumns
    ? getTopLevelObjectPairs(row.raw, columnId, dataView, shouldShowFieldHandler).slice(
        0,
        maxEntries
      )
    : formatHit(row, dataView, shouldShowFieldHandler, maxEntries, fieldFormats);

  // return a different view in case of ES|QL (JSON tree view)
  if (isPlainRecord) {
    return (
      <JSONTree
        data={row.raw as unknown as Record<string, unknown>}
        isDarkMode={isDarkMode ?? false}
        isSingleRow={isSingleRow ?? false}
        onTreeExpand={onTreeExpand}
      />
    );
  }

  return (
    <EuiDescriptionList
      type="inline"
      compressed
      className={classnames('unifiedDataTable__descriptionList', CELL_CLASS, className)}
      data-test-subj={dataTestSubj}
    >
      {pairs.map(([fieldDisplayName, value, fieldName]) => {
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

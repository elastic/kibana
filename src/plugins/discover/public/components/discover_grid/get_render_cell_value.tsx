/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useContext, useEffect } from 'react';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  euiLightVars as themeLight,
  euiDarkVars as themeDark,
} from '@kbn/ui-shared-deps-src/theme';
import type { DataView, DataViewField } from 'src/plugins/data/common';
import {
  EuiDataGridCellValueElementProps,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { DiscoverGridContext } from './discover_grid_context';
import { JsonCodeEditor } from '../json_code_editor/json_code_editor';
import { defaultMonacoEditorWidth } from './constants';
import { EsHitRecord } from '../../application/types';
import { formatFieldValue } from '../../utils/format_value';
import { formatHit } from '../../utils/format_hit';
import { ElasticSearchHit } from '../../types';

export const getRenderCellValueFn =
  (
    indexPattern: DataView,
    rows: ElasticSearchHit[] | undefined,
    rowsFlattened: Array<Record<string, unknown>>,
    useNewFieldsApi: boolean,
    fieldsToShow: string[],
    maxDocFieldsDisplayed: number
  ) =>
  ({ rowIndex, columnId, isDetails, setCellProps }: EuiDataGridCellValueElementProps) => {
    const row = rows ? rows[rowIndex] : undefined;
    const rowFlattened = rowsFlattened
      ? (rowsFlattened[rowIndex] as Record<string, unknown>)
      : undefined;

    const field = indexPattern.fields.getByName(columnId);
    const ctx = useContext(DiscoverGridContext);

    useEffect(() => {
      if ((row as EsHitRecord).isAnchor) {
        setCellProps({
          className: 'dscDocsGrid__cell--highlight',
        });
      } else if (ctx.expanded && row && ctx.expanded._id === row._id) {
        setCellProps({
          style: {
            backgroundColor: ctx.isDarkMode
              ? themeDark.euiColorHighlight
              : themeLight.euiColorHighlight,
          },
        });
      } else {
        setCellProps({ style: undefined });
      }
    }, [ctx, row, setCellProps]);

    if (typeof row === 'undefined' || typeof rowFlattened === 'undefined') {
      return <span>-</span>;
    }

    /**
     * when using the fields api this code is used to show top level objects
     * this is used for legacy stuff like displaying products of our ecommerce dataset
     */
    const useTopLevelObjectColumns = Boolean(
      useNewFieldsApi &&
        !field &&
        row?.fields &&
        !(row.fields as Record<string, unknown[]>)[columnId]
    );

    if (isDetails) {
      return renderPopoverContent(
        row,
        rowFlattened,
        field,
        columnId,
        indexPattern,
        useTopLevelObjectColumns
      );
    }

    if (field?.type === '_source' || useTopLevelObjectColumns) {
      const pairs = useTopLevelObjectColumns
        ? getTopLevelObjectPairs(row, columnId, indexPattern, fieldsToShow).slice(
            0,
            maxDocFieldsDisplayed
          )
        : formatHit(row, indexPattern, fieldsToShow);

      return (
        <EuiDescriptionList type="inline" compressed className="dscDiscoverGrid__descriptionList">
          {pairs.map(([key, value]) => (
            <Fragment key={key}>
              <EuiDescriptionListTitle>{key}</EuiDescriptionListTitle>
              <EuiDescriptionListDescription
                className="dscDiscoverGrid__descriptionListDescription"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            </Fragment>
          ))}
        </EuiDescriptionList>
      );
    }

    if (!field?.type && rowFlattened && typeof rowFlattened[columnId] === 'object') {
      return <span>{JSON.stringify(rowFlattened[columnId])}</span>;
    }

    return (
      <span
        // formatFieldValue guarantees sanitized values
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: formatFieldValue(rowFlattened[columnId], row, indexPattern, field),
        }}
      />
    );
  };

/**
 * Helper function to show top level objects
 * this is used for legacy stuff like displaying products of our ecommerce dataset
 */
function getInnerColumns(fields: Record<string, unknown[]>, columnId: string) {
  return Object.fromEntries(
    Object.entries(fields).filter(([key]) => {
      return key.indexOf(`${columnId}.`) === 0;
    })
  );
}

/**
 * Helper function for the cell popover
 */
function renderPopoverContent(
  rowRaw: estypes.SearchHit,
  rowFlattened: Record<string, unknown>,
  field: DataViewField | undefined,
  columnId: string,
  dataView: DataView,
  useTopLevelObjectColumns: boolean
) {
  if (useTopLevelObjectColumns || field?.type === '_source') {
    const json = useTopLevelObjectColumns
      ? getInnerColumns(rowRaw.fields as Record<string, unknown[]>, columnId)
      : rowRaw;
    return (
      <JsonCodeEditor json={json as Record<string, unknown>} width={defaultMonacoEditorWidth} />
    );
  }

  return (
    <span
      // formatFieldValue guarantees sanitized values
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: formatFieldValue(rowFlattened[columnId], rowRaw, dataView, field),
      }}
    />
  );
}
/**
 * Helper function to show top level objects
 * this is used for legacy stuff like displaying products of our ecommerce dataset
 */
function getTopLevelObjectPairs(
  row: estypes.SearchHit,
  columnId: string,
  dataView: DataView,
  fieldsToShow: string[]
) {
  const innerColumns = getInnerColumns(row.fields as Record<string, unknown[]>, columnId);
  // Put the most important fields first
  const highlights: Record<string, unknown> = (row.highlight as Record<string, unknown>) ?? {};
  const highlightPairs: Array<[string, string]> = [];
  const sourcePairs: Array<[string, string]> = [];
  Object.entries(innerColumns).forEach(([key, values]) => {
    const subField = dataView.getFieldByName(key);
    const displayKey = dataView.fields.getByName
      ? dataView.fields.getByName(key)?.displayName
      : undefined;
    const formatter = subField
      ? dataView.getFormatterForField(subField)
      : { convert: (v: unknown, ...rest: unknown[]) => String(v) };
    const formatted = (values as unknown[])
      .map((val: unknown) =>
        formatter.convert(val, 'html', {
          field: subField,
          hit: row,
          indexPattern: dataView,
        })
      )
      .join(', ');
    const pairs = highlights[key] ? highlightPairs : sourcePairs;
    if (displayKey) {
      if (fieldsToShow.includes(displayKey)) {
        pairs.push([displayKey, formatted]);
      }
    } else {
      pairs.push([key, formatted]);
    }
  });
  return [...highlightPairs, ...sourcePairs];
}

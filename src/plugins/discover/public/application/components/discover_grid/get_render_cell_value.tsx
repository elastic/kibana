/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useContext, useEffect } from 'react';
import themeLight from '@elastic/eui/dist/eui_theme_light.json';
import themeDark from '@elastic/eui/dist/eui_theme_dark.json';

import {
  EuiDataGridCellValueElementProps,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';
import { IndexPattern } from '../../../kibana_services';
import { ElasticSearchHit } from '../../doc_views/doc_views_types';
import { DiscoverGridContext } from './discover_grid_context';
import { JsonCodeEditor } from '../json_code_editor/json_code_editor';
import { defaultMonacoEditorWidth } from './constants';

export const getRenderCellValueFn = (
  indexPattern: IndexPattern,
  rows: ElasticSearchHit[] | undefined,
  rowsFlattened: Array<Record<string, unknown>>,
  useNewFieldsApi: boolean,
  maxDocFieldsDisplayed: number
) => ({ rowIndex, columnId, isDetails, setCellProps }: EuiDataGridCellValueElementProps) => {
  const row = rows ? rows[rowIndex] : undefined;
  const rowFlattened = rowsFlattened
    ? (rowsFlattened[rowIndex] as Record<string, unknown>)
    : undefined;

  const field = indexPattern.fields.getByName(columnId);
  const ctx = useContext(DiscoverGridContext);

  useEffect(() => {
    if (ctx.expanded && row && ctx.expanded._id === row._id) {
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

  if (
    useNewFieldsApi &&
    !field &&
    row &&
    row.fields &&
    !(row.fields as Record<string, unknown[]>)[columnId]
  ) {
    const innerColumns = Object.fromEntries(
      Object.entries(row.fields as Record<string, unknown[]>).filter(([key]) => {
        return key.indexOf(`${columnId}.`) === 0;
      })
    );
    if (isDetails) {
      // nicely formatted JSON for the expanded view
      return <span>{JSON.stringify(innerColumns, null, 2)}</span>;
    }

    // Put the most important fields first
    const highlights: Record<string, unknown> = (row.highlight as Record<string, unknown>) ?? {};
    const highlightPairs: Array<[string, string]> = [];
    const sourcePairs: Array<[string, string]> = [];
    Object.entries(innerColumns).forEach(([key, values]) => {
      const subField = indexPattern.getFieldByName(key);
      const displayKey = indexPattern.fields.getByName
        ? indexPattern.fields.getByName(key)?.displayName
        : undefined;
      const formatter = subField
        ? indexPattern.getFormatterForField(subField)
        : { convert: (v: string, ...rest: unknown[]) => String(v) };
      const formatted = (values as unknown[])
        .map((val: unknown) =>
          formatter.convert(val, 'html', {
            field: subField,
            hit: row,
            indexPattern,
          })
        )
        .join(', ');
      const pairs = highlights[key] ? highlightPairs : sourcePairs;
      pairs.push([displayKey ? displayKey : key, formatted]);
    });

    return (
      <EuiDescriptionList type="inline" compressed className="dscDiscoverGrid__descriptionList">
        {[...highlightPairs, ...sourcePairs].slice(0, maxDocFieldsDisplayed).map(([key, value]) => (
          <Fragment key={key}>
            <EuiDescriptionListTitle>{key}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription
              dangerouslySetInnerHTML={{ __html: value }}
              className="dscDiscoverGrid__descriptionListDescription"
            />
          </Fragment>
        ))}
      </EuiDescriptionList>
    );
  }

  if (typeof rowFlattened[columnId] === 'object' && isDetails) {
    return (
      <JsonCodeEditor
        json={rowFlattened[columnId] as Record<string, any>}
        width={defaultMonacoEditorWidth}
      />
    );
  }

  if (field && field.type === '_source') {
    if (isDetails) {
      return <JsonCodeEditor json={row} width={defaultMonacoEditorWidth} />;
    }
    const formatted = indexPattern.formatHit(row);

    // Put the most important fields first
    const highlights: Record<string, unknown> = (row.highlight as Record<string, unknown>) ?? {};
    const highlightPairs: Array<[string, string]> = [];
    const sourcePairs: Array<[string, string]> = [];

    Object.entries(formatted).forEach(([key, val]) => {
      const pairs = highlights[key] ? highlightPairs : sourcePairs;
      const displayKey = indexPattern.fields.getByName
        ? indexPattern.fields.getByName(key)?.displayName
        : undefined;
      pairs.push([displayKey ? displayKey : key, val as string]);
    });

    return (
      <EuiDescriptionList type="inline" compressed className="dscDiscoverGrid__descriptionList">
        {[...highlightPairs, ...sourcePairs].slice(0, maxDocFieldsDisplayed).map(([key, value]) => (
          <Fragment key={key}>
            <EuiDescriptionListTitle>{key}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription
              dangerouslySetInnerHTML={{ __html: value }}
              className="dscDiscoverGrid__descriptionListDescription"
            />
          </Fragment>
        ))}
      </EuiDescriptionList>
    );
  }

  if (!field?.type && rowFlattened && typeof rowFlattened[columnId] === 'object') {
    if (isDetails) {
      // nicely formatted JSON for the expanded view
      return <span>{JSON.stringify(rowFlattened[columnId], null, 2)}</span>;
    }

    return <span>{JSON.stringify(rowFlattened[columnId])}</span>;
  }

  const valueFormatted = indexPattern.formatField(row, columnId);
  if (typeof valueFormatted === 'undefined') {
    return <span>-</span>;
  }
  return (
    // eslint-disable-next-line react/no-danger
    <span dangerouslySetInnerHTML={{ __html: indexPattern.formatField(row, columnId) }} />
  );
};

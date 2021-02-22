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

export const getRenderCellValueFn = (
  indexPattern: IndexPattern,
  rows: ElasticSearchHit[] | undefined,
  rowsFlattened: Array<Record<string, unknown>>
) => ({ rowIndex, columnId, isDetails, setCellProps }: EuiDataGridCellValueElementProps) => {
  const row = rows ? (rows[rowIndex] as Record<string, unknown>) : undefined;
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

  if (field && field.type === '_source') {
    if (isDetails) {
      // nicely formatted JSON for the expanded view
      return <span>{JSON.stringify(row, null, 2)}</span>;
    }
    const formatted = indexPattern.formatHit(row);

    return (
      <EuiDescriptionList type="inline" compressed className="dscDiscoverGrid__descriptionList">
        {Object.keys(formatted).map((key) => (
          <Fragment key={key}>
            <EuiDescriptionListTitle>{key}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription
              dangerouslySetInnerHTML={{ __html: formatted[key] }}
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

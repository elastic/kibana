/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToken,
} from '@elastic/eui';
import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { formatHitReact } from '@kbn/discover-utils';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { CustomCellRenderer } from '@kbn/unified-data-table';

const ALERT_MESSAGE_FIELD = 'message';
const ALERT_REASON_FIELD = 'kibana.alert.reason';
const EMPTY_CELL_PLACEHOLDER = '—';

export function getAlertMessageFromSource(source: Record<string, unknown>): string {
  const message = source[ALERT_MESSAGE_FIELD];
  if (message !== undefined && message !== null) {
    return typeof message === 'string' ? message : String(message);
  }
  const reason = source[ALERT_REASON_FIELD];
  if (reason !== undefined && reason !== null) {
    return typeof reason === 'string' ? reason : String(reason);
  }
  return EMPTY_CELL_PLACEHOLDER;
}

export function createAlertMessageCellRenderer(): CustomCellRenderer {
  return {
    'kibana.alert.reason': ({ row }) => {
      const source = (row.raw._source ?? {}) as Record<string, unknown>;
      return <EuiText size="s">{getAlertMessageFromSource(source)}</EuiText>;
    },
  };
}

export function createDocumentSummaryCellRenderer(options: {
  dataView: DataView | null;
  fieldFormats: FieldFormatsStart;
  maxEntries?: number;
}): CustomCellRenderer {
  const { dataView, fieldFormats, maxEntries = 10 } = options;

  return {
    document: ({ row }) => {
      const source = (row.raw._source ?? {}) as Record<string, unknown>;
      if (!source || Object.keys(source).length === 0) {
        return <EuiText size="s">{EMPTY_CELL_PLACEHOLDER}</EuiText>;
      }

      const formattedPairs =
        dataView && typeof dataView.getFieldByName === 'function'
          ? formatHitReact(
              row as DataTableRecord,
              dataView,
              () => true,
              maxEntries,
              fieldFormats,
              undefined
            )
          : [];

      return (
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiToken iconType="tokenString" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiDescriptionList type="inline">
              {formattedPairs.map(([title, description], index) => (
                <React.Fragment key={index}>
                  <EuiDescriptionListTitle>{title}</EuiDescriptionListTitle>
                  <EuiDescriptionListDescription>
                    {description ?? EMPTY_CELL_PLACEHOLDER}
                  </EuiDescriptionListDescription>
                </React.Fragment>
              ))}
            </EuiDescriptionList>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
  };
}

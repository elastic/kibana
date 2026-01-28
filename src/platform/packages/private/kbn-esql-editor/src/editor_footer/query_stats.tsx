/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { round } from 'lodash';
import type { ESQLQueryStats } from '@kbn/esql-types';

function formatDocumentCount(count: number): string {
  if (count >= 1000000000) {
    const rounded = round(count / 1000000000, 1);
    return `${rounded === Math.floor(rounded) ? Math.floor(rounded) : rounded}B`;
  }
  if (count >= 1000000) {
    const rounded = round(count / 1000000, 1);
    return `${rounded === Math.floor(rounded) ? Math.floor(rounded) : rounded}M`;
  }
  if (count >= 1000) {
    const rounded = round(count / 1000, 1);
    return `${rounded === Math.floor(rounded) ? Math.floor(rounded) : rounded}K`;
  }
  return count.toString();
}

export function ESQLQueryStats({ queryStats }: { queryStats: ESQLQueryStats }) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {queryStats.durationInMs && (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" data-test-subj="ESQLEditor-queryStats-queryDuration">
            <p>
              {i18n.translate('esqlEditor.queryStats.queryDuration', {
                defaultMessage: 'Completed {duration}',
                values: {
                  duration: queryStats.durationInMs,
                },
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
      )}
      {queryStats.totalDocumentsQueried !== undefined && (
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj="ESQLEditor-queryStats-totalDocumentsQueries"
          >
            <p>
              {i18n.translate('esqlEditor.queryStats.documentsQueries', {
                defaultMessage: '| {count} documents queried',
                values: {
                  count: formatDocumentCount(queryStats.totalDocumentsQueried ?? 0),
                },
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}

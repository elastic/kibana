/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiText, EuiTextTruncate, EuiLink } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { ErrorGroupMainStatisticsResponse } from '@kbn/apm-types';
import { ERROR_GROUP_ID } from '@kbn/apm-types';
import type { GenerateDiscoverLink } from '../../hooks/use_get_generate_discover_link';

const NOT_AVAILABLE_LABEL = i18n.translate(
  'unifiedDocViewer.observability.traces.docViewerSpanOverview.errors.na',
  {
    defaultMessage: 'N/A',
  }
);

export const getColumns = (
  generateDiscoverLink: GenerateDiscoverLink
): Array<EuiBasicTableColumn<ErrorGroupMainStatisticsResponse['errorGroups'][0]>> => [
  {
    field: 'name',
    name: i18n.translate(
      'unifiedDocViewer.observability.traces.docViewerSpanOverview.errors.table.error',
      { defaultMessage: 'Error message and culprit' }
    ),
    sortable: (item) => item.name || '',
    render: (_, item) => {
      const href = generateDiscoverLink({ [ERROR_GROUP_ID]: item.groupId });

      const content = (
        <EuiTextTruncate
          data-test-subj={`error-group-${item.groupId}`}
          text={item.name || NOT_AVAILABLE_LABEL}
        />
      );
      return (
        <span
          css={css`
            width: 100%;
          `}
        >
          {href ? (
            <EuiLink data-test-subj={`error-group-link-${item.groupId}`} href={href}>
              {content}
            </EuiLink>
          ) : (
            content
          )}
          <EuiText size="s" />
          {item.culprit && (
            <EuiText size="xs" color="subdued">
              <EuiTextTruncate
                data-test-subj={`error-culprit-${item.groupId}`}
                text={item.culprit}
              />
            </EuiText>
          )}
        </span>
      );
    },
  },
  {
    field: 'occurrences',
    width: '20%',
    name: i18n.translate(
      'unifiedDocViewer.observability.traces.docViewerSpanOverview.errors.table.occurrences',
      { defaultMessage: 'Occurrences' }
    ),
    sortable: (item) => item.occurrences || 0,
    render: (_, item) =>
      item.occurrences
        ? i18n.translate(
            'unifiedDocViewer.observability.traces.docViewerSpanOverview.errors.table.occurrences.value',
            {
              defaultMessage: `{occurrences} occ.`,
              values: {
                occurrences: item.occurrences,
              },
            }
          )
        : NOT_AVAILABLE_LABEL,
  },
];

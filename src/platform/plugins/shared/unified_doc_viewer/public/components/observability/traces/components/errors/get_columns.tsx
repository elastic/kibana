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
import type { ErrorData, ErrorsByTraceId } from '@kbn/apm-types';
import {
  TRACE_ID,
  SPAN_ID,
  PROCESSOR_EVENT,
  EVENT_NAME,
  ERROR_ID,
  EXCEPTION_MESSAGE,
} from '@kbn/apm-types';
import type { GenerateDiscoverLink } from '../../hooks/use_get_generate_discover_link';
import { NOT_AVAILABLE_LABEL } from '../../common/constants';

const getErrorMessage = (error: ErrorData) => {
  if (error?.exception?.message) {
    return error.exception.message;
  }

  if (error?.log?.message) {
    return error.log.message;
  }

  return NOT_AVAILABLE_LABEL;
};

export const getColumns = ({
  generateDiscoverLink,
  traceId,
  docId,
  source,
}: {
  generateDiscoverLink: GenerateDiscoverLink;
  traceId: string;
  docId?: string;
  source: string;
}): Array<EuiBasicTableColumn<ErrorsByTraceId['traceErrors'][0]>> => [
  {
    field: 'name',
    name: i18n.translate(
      'unifiedDocViewer.observability.traces.docViewerSpanOverview.errors.table.error',
      { defaultMessage: 'Error message and culprit' }
    ),
    sortable: (item) => item.error?.exception?.message || '',
    render: (_, item) => {
      const href = generateDiscoverLink({
        [TRACE_ID]: traceId,
        ...(docId && { [SPAN_ID]: docId }),
        ...(source === 'apm' ? { [PROCESSOR_EVENT]: 'error', [ERROR_ID]: item.error.id } : null),
        ...(source === 'unprocessedOtel'
          ? {
              [EVENT_NAME]: item?.eventName,
              [EXCEPTION_MESSAGE]: item?.error?.exception?.message,
            }
          : null),
      });

      const content = (
        <EuiTextTruncate
          data-test-subj="error-exception-message"
          text={getErrorMessage(item.error)}
        />
      );
      return (
        <span
          css={css`
            width: 100%;
          `}
        >
          {href ? (
            <EuiLink data-test-subj="error-group-link" href={href}>
              {content}
            </EuiLink>
          ) : (
            content
          )}
          <EuiText size="s" />

          <EuiText size="xs" color="subdued">
            <EuiTextTruncate
              data-test-subj="error-culprit"
              text={item.error.culprit || NOT_AVAILABLE_LABEL}
            />
          </EuiText>
        </span>
      );
    },
  },
];

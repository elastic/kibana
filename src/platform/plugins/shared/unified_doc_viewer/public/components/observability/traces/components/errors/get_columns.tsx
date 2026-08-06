/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiText, EuiTextTruncate } from '@elastic/eui';
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
import { EBT_CLICK_ACTIONS } from '@kbn/ebt-click';
import type { ESQLAstExpression } from '@elastic/esql/types';
import { type NonEmptyArray, esqlAnd, esqlEquals } from '../../../../../utils/esql_expressions';
import { useDataSourcesContext } from '../../../../../hooks/use_data_sources';
import { NOT_AVAILABLE_LABEL } from '../../common/constants';
import { TRACES_DOC_VIEWER_EBT_ELEMENTS, TRACES_DOC_VIEWER_EBT_DETAILS } from '../../ebt_constants';
import { DiscoverEsqlLink } from '../discover_esql_link';

const errorEbt = {
  action: EBT_CLICK_ACTIONS.VIEW_ERROR,
  element: TRACES_DOC_VIEWER_EBT_ELEMENTS.ERRORS,
  detail: TRACES_DOC_VIEWER_EBT_DETAILS.SPAN_DOC,
};

function createWhereClause({
  traceId,
  docId,
  source,
  item,
}: {
  traceId: string;
  docId?: string;
  source: ErrorsByTraceId['source'];
  item: ErrorsByTraceId['traceErrors'][0];
}): ESQLAstExpression {
  const conditions: NonEmptyArray<ESQLAstExpression> = [esqlEquals(TRACE_ID, traceId)];

  if (docId) {
    conditions.push(esqlEquals(SPAN_ID, docId));
  }

  if (source === 'apm') {
    conditions.push(esqlEquals(PROCESSOR_EVENT, 'error'));
    if (item.error.id) {
      conditions.push(esqlEquals(ERROR_ID, item.error.id));
    }
  }

  if (source === 'unprocessedOtel') {
    if (item?.eventName) {
      conditions.push(esqlEquals(EVENT_NAME, item.eventName));
    }
    if (item?.error?.exception?.message) {
      conditions.push(esqlEquals(EXCEPTION_MESSAGE, item.error.exception.message));
    }
  }

  return esqlAnd(conditions);
}

const ErrorMessageLinkCell = ({
  traceId,
  docId,
  source,
  item,
}: {
  traceId: string;
  docId?: string;
  source: ErrorsByTraceId['source'];
  item: ErrorsByTraceId['traceErrors'][0];
}) => {
  const { indexes } = useDataSourcesContext();
  const errorLabel = getErrorMessage(item.error);

  const content = <EuiTextTruncate data-test-subj="error-exception-message" text={errorLabel} />;

  return (
    <DiscoverEsqlLink
      indexPattern={indexes.apm.errors}
      whereClause={createWhereClause({ traceId, docId, source, item })}
      tabLabel={errorLabel}
      dataTestSubj="error-group-link"
      ebt={errorEbt}
    >
      {content}
    </DiscoverEsqlLink>
  );
};

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
  traceId,
  docId,
  source,
}: {
  traceId: string;
  docId?: string;
  source: ErrorsByTraceId['source'];
}): Array<EuiBasicTableColumn<ErrorsByTraceId['traceErrors'][0]>> => [
  {
    field: 'name',
    name: i18n.translate(
      'unifiedDocViewer.observability.traces.docViewerSpanOverview.errors.table.error',
      { defaultMessage: 'Error message and culprit' }
    ),
    sortable: (item) => item.error?.exception?.message || '',
    render: (_, item) => {
      return (
        <span
          css={css`
            width: 100%;
          `}
        >
          <ErrorMessageLinkCell traceId={traceId} docId={docId} source={source} item={item} />
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { APMClient } from '@kbn/apm-api-client';
import { useAbortableAsync } from '@kbn/react-hooks';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Loading } from '../trace_waterfall/loading';
import { FocusedTraceWaterfallViewer } from './focused_trace_waterfall_viewer';

interface Props {
  callApmApi: APMClient;
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
  docId: string;
}

export function FocusedTraceWaterfallFetcher({
  callApmApi,
  traceId,
  rangeFrom,
  rangeTo,
  docId,
}: Props) {
  const { loading, error, value } = useAbortableAsync(
    async ({ signal }) => {
      return callApmApi('GET /internal/apm/unified_traces/{traceId}/summary', {
        params: { path: { traceId }, query: { start: rangeFrom, end: rangeTo, docId } },
        signal,
      });
    },
    [callApmApi, traceId, rangeFrom, rangeTo, docId]
  );
  if (loading) {
    return <Loading />;
  }
  if (error || value === undefined) {
    return (
      <EuiCallOut
        announceOnMount
        data-test-subj="FocusedTraceWaterfallEmbeddableNoData"
        color="danger"
        size="s"
        title={i18n.translate('xpack.apm.focusedTraceWaterfallFetcher.noDataCalloutLabel', {
          defaultMessage: 'Focused trace waterfall could not be loaded.',
        })}
      />
    );
  }

  return <FocusedTraceWaterfallViewer items={value} isEmbeddable />;
}

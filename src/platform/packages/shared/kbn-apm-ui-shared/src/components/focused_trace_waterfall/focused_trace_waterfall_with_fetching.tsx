/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut } from '@elastic/eui';
import type { APMClientV2 } from '@kbn/apm-api-shared';
import type { FocusedTraceWaterfallProps, WaterfallGetErrorMarkerHref } from '@kbn/apm-types';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/react-hooks';
import React from 'react';
import { FocusedTraceWaterfall } from '.';
import { Loading } from '../trace_waterfall/loading';
import { useGetServiceBadgeHrefFromCore } from '../trace_waterfall/use_get_service_badge_href_from_core';

interface Props extends FocusedTraceWaterfallProps {
  core: CoreStart;
  callApmApi: APMClientV2;
  getErrorMarkerHref?: WaterfallGetErrorMarkerHref;
}

export function FocusedTraceWaterfallWithFetching({
  traceId,
  rangeFrom,
  rangeTo,
  docId,
  core,
  callApmApi,
  getErrorMarkerHref,
}: Props) {
  const getServiceBadgeHref = useGetServiceBadgeHrefFromCore(core, rangeFrom, rangeTo);

  const {
    value: data,
    loading,
    error,
  } = useAbortableAsync(
    ({ signal }) => {
      return callApmApi('GET /internal/apm/unified_traces/{traceId}/summary', {
        signal,
        params: {
          path: { traceId },
          query: { start: rangeFrom, end: rangeTo, docId },
        },
      });
    },
    [docId, rangeFrom, rangeTo, traceId]
  );

  if (loading || (!error && data === undefined)) {
    return <Loading />;
  }

  if (error || data === undefined) {
    return (
      <EuiCallOut
        announceOnMount
        data-test-subj="FocusedTraceWaterfallEmbeddableNoData"
        color="danger"
        size="s"
        title={i18n.translate('apmUiShared.focusedTraceWaterfallEmbeddable.noDataCalloutLabel', {
          defaultMessage: 'Trace waterfall could not be loaded.',
        })}
      />
    );
  }

  return (
    <FocusedTraceWaterfall
      items={data}
      isEmbeddable
      getServiceBadgeHref={getServiceBadgeHref}
      getErrorMarkerHref={getErrorMarkerHref}
    />
  );
}

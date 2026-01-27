/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiCallOut } from '@elastic/eui';
import type { APMClient } from '@kbn/apm-api-client';
import { i18n } from '@kbn/i18n';
import { useAbortableAsync } from '@kbn/react-hooks';
import React from 'react';
import { TraceWaterfall } from '../trace_waterfall';
import type { WaterfallGetRelatedErrorsHref } from '../../types/trace_item';
import { Loading } from '../trace_waterfall/loading';
import type { OnErrorClick, OnNodeClick } from '../trace_waterfall/trace_waterfall_context';

interface Props {
  serviceName: string;
  rangeFrom: string;
  rangeTo: string;
  traceId: string;
  scrollElement: Element;
  onNodeClick: OnNodeClick;
  getRelatedErrorsHref?: WaterfallGetRelatedErrorsHref;
  onErrorClick: OnErrorClick;
  callApmApi: APMClient;
}
export function FullTraceWaterfallFetcher({
  callApmApi,
  serviceName,
  rangeFrom,
  rangeTo,
  traceId,
  scrollElement,
  onNodeClick,
  getRelatedErrorsHref,
  onErrorClick,
}: Props) {
  const { loading, error, value } = useAbortableAsync(
    async ({ signal }) => {
      return callApmApi('GET /internal/apm/unified_traces/{traceId}', {
        params: {
          path: { traceId },
          query: {
            start: rangeFrom,
            end: rangeTo,
            serviceName: undefined,
          },
        },
        signal,
      });
    },
    [callApmApi, traceId, rangeFrom, rangeTo, serviceName]
  );

  if (loading) {
    return <Loading />;
  }

  if (error || value === undefined) {
    return (
      <EuiCallOut
        announceOnMount
        data-test-subj="TraceWaterfallEmbeddableNoData"
        color="danger"
        size="s"
        title={i18n.translate('xpack.apm.traceWaterfallEmbeddable.noDataCalloutLabel', {
          defaultMessage: 'Trace waterfall could not be loaded.',
        })}
      />
    );
  }

  return (
    <TraceWaterfall
      traceItems={value.traceItems}
      errors={value.errors}
      onClick={onNodeClick}
      scrollElement={scrollElement}
      getRelatedErrorsHref={getRelatedErrorsHref}
      isEmbeddable
      showLegend
      serviceName={serviceName}
      onErrorClick={onErrorClick}
      agentMarks={value.agentMarks}
      showCriticalPathControl
    />
  );
}

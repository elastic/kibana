/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getESQLResults } from '@kbn/esql-utils';
import type { XYChartRenderProps } from '../components/xy_chart';
import { XYChartReportable } from '../components/xy_chart';
import type { BubblePoint } from '../helpers/bubbles';
import { mapExemplarResponse } from '../helpers/exemplar_bubbles';

/**
 * Fetches the bubble (exemplar) query at render time and re-runs it on every time
 * change, so the markers stay in sync with the chart wherever Lens renders it
 * (metrics grid, dashboards, Discover). Failures render no markers and never break
 * the chart.
 */
const useExemplarBubbles = (
  data: DataPublicPluginStart,
  query: string | undefined,
  valueColumn: string | undefined
): BubblePoint[] | undefined => {
  const [bubbles, setBubbles] = useState<BubblePoint[] | undefined>();

  useEffect(() => {
    if (!query || !valueColumn) {
      setBubbles(undefined);
      return;
    }

    let controller: AbortController | undefined;
    const run = () => {
      controller?.abort();
      controller = new AbortController();
      getESQLResults({
        esqlQuery: query,
        search: data.search.search,
        signal: controller.signal,
        timeRange: data.query.timefilter.timefilter.getTime(),
      })
        .then(({ response }) => setBubbles(mapExemplarResponse(response, valueColumn)))
        .catch(() => {
          // Exemplars are supplementary, so a failed fetch just renders no markers.
        });
    };

    run();
    const subscription = data.query.timefilter.timefilter.getTimeUpdate$().subscribe(run);
    return () => {
      subscription.unsubscribe();
      controller?.abort();
    };
  }, [data, query, valueColumn]);

  return bubbles;
};

/**
 * Wraps the XY chart and, when the expression carries a `bubblesQuery`, fetches the
 * bubble markers from Lens itself and feeds them into the chart's `bubbles` arg.
 */
export const XYChartWithExemplars = (props: XYChartRenderProps) => {
  const { args, data } = props;
  const bubbles = useExemplarBubbles(
    data,
    args.bubblesQuery || undefined,
    args.bubblesValueColumn || undefined
  );

  if (!args.bubblesQuery) {
    return <XYChartReportable {...props} />;
  }

  return (
    <XYChartReportable {...props} args={{ ...args, bubbles: JSON.stringify(bubbles ?? []) }} />
  );
};

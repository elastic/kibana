/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { DataSource } from '@kbn/data-source';
import type { DISCOVER_AD_ANOMALIES_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type {
  UnifiedHistogramFetch$,
  UnifiedHistogramFetch$Arguments,
  UnifiedHistogramServices,
} from '../../../types';
import type {
  UnifiedHistogramAnomalyOverlay,
  UnifiedHistogramAnomalyRange,
} from '../../../utils/anomaly_overlay';
import { useAdIndexPattern } from './use_ad_index_pattern';

// Avoid taking a dependency on uiActionsPlugin just for this const
const discoverAdAnomaliesTrigger: typeof DISCOVER_AD_ANOMALIES_TRIGGER =
  'DISCOVER_AD_ANOMALIES_TRIGGER';

/** The anomaly detection job selected for the chart, and whether its anomalies are shown. */
export interface UnifiedHistogramAnomalyJobSelection {
  jobId?: string;
  showAnomalies: boolean;
  setShowAnomalies: (show: boolean) => void;
}

/**
 * Returns the time ranges in which anomaly detection jobs for the data source found anomalies,
 * with the time range of the chart, loaded every time the chart is fetched, and the job which is selected.
 * They are undefined when nothing provides them.
 */
export const useAnomalyRanges = ({
  services,
  dataSource,
  fetch$,
}: {
  services: UnifiedHistogramServices;
  dataSource: DataSource | undefined;
  fetch$: UnifiedHistogramFetch$;
}): {
  overlay: UnifiedHistogramAnomalyOverlay | undefined;
  jobSelection: UnifiedHistogramAnomalyJobSelection | undefined;
} => {
  const [overlay, setOverlay] = useState<UnifiedHistogramAnomalyOverlay>();
  const [jobSelection, setJobSelection] = useState<UnifiedHistogramAnomalyJobSelection>();
  const { indexPattern } = useAdIndexPattern(dataSource);

  useEffect(() => {
    setOverlay(undefined);
    setJobSelection(undefined);
    if (!indexPattern) {
      return;
    }

    let abortController: AbortController | undefined;
    const subscription = fetch$.subscribe(({ fetchParams }: UnifiedHistogramFetch$Arguments) => {
      abortController?.abort();
      const { signal } = (abortController = new AbortController());

      const { min, max } = services.data.query.timefilter.timefilter.calculateBounds(
        fetchParams.timeRange
      );
      if (!min || !max) {
        return;
      }

      const timeRange = { from: min.valueOf(), to: max.valueOf() };
      services.uiActions
        .executeTriggerActions(discoverAdAnomaliesTrigger, {
          indexPattern,
          timeRange,
          signal,
          onAnomalyRanges: (newRanges: UnifiedHistogramAnomalyRange[]) => {
            if (!signal.aborted) {
              setOverlay({ ranges: newRanges, timeRange });
            }
          },
          onJobSelection: (selection: UnifiedHistogramAnomalyJobSelection) => {
            if (!signal.aborted) {
              setJobSelection(selection);
            }
          },
        })
        .catch(() => {});
    });

    return () => {
      abortController?.abort();
      subscription.unsubscribe();
    };
  }, [services.data, services.uiActions, fetch$, indexPattern]);

  return { overlay, jobSelection };
};

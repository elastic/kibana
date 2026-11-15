/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import type { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import type { DISCOVER_AD_ANOMALY_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { UnifiedHistogramServices } from '../../../types';
import type { UnifiedHistogramAnomalyRange } from '../../../utils/anomaly_overlay';

// Avoid taking a dependency on uiActionsPlugin just for this const
const discoverAdAnomalyTrigger: typeof DISCOVER_AD_ANOMALY_TRIGGER = 'DISCOVER_AD_ANOMALY_TRIGGER';

/**
 * Returns the handler of clicks on the chart's annotations, which triggers the actions to show
 * the anomaly when the click is on the overlay of an anomaly. Lens takes its callbacks when
 * it loads, so the handler is always the same, and uses the latest ranges.
 */
export const useAnomalyClick = ({
  services,
  ranges,
}: {
  services: UnifiedHistogramServices;
  ranges: UnifiedHistogramAnomalyRange[] | undefined;
}): NonNullable<LensEmbeddableInput['onAnnotationClick']> => {
  const { uiActions } = services;
  const rangesRef = useRef(ranges);
  useEffect(() => {
    rangesRef.current = ranges;
  }, [ranges]);

  const onAnnotationClick = useCallback<NonNullable<LensEmbeddableInput['onAnnotationClick']>>(
    ({ annotations }) => {
      const clicked = annotations
        .map(({ time }) => rangesRef.current?.find(({ start }) => start === Date.parse(time)))
        .find((range) => range?.jobId !== undefined);
      if (!clicked?.jobId) {
        return;
      }

      uiActions
        .executeTriggerActions(discoverAdAnomalyTrigger, {
          jobId: clicked.jobId,
          timestamp: clicked.start,
          endTimestamp: clicked.end,
          score: clicked.score,
        })
        .catch(() => {});
    },
    [uiActions]
  );

  return onAnnotationClick;
};

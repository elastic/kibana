/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useCallback, useContext, useRef } from 'react';
import { isSuppressedFetchError } from '../../../chart/utils/is_suppressed_fetch_error';
import {
  fetchMetricsWithExemplars,
  type FetchMetricsWithExemplarsParams,
} from '../utils/fetch_metrics_with_exemplars';

export interface ProbeExemplarsAvailabilityParams extends FetchMetricsWithExemplarsParams {
  /** Called at most once per probe request, never for aborts. */
  onError: (error: unknown) => void;
}

export type ProbeExemplarsAvailability = (
  params: ProbeExemplarsAvailabilityParams
) => Promise<ReadonlySet<string>>;

const NO_METRICS: ReadonlySet<string> = new Set();

const ExemplarsAvailabilityContext = createContext<ProbeExemplarsAvailability | undefined>(
  undefined
);

/**
 * Shares one exemplars availability probe between every chart in the grid. The probe never
 * rejects: a failure is reported once through `onError` and resolves to an empty set.
 */
export const ExemplarsAvailabilityProvider = ({ children }: { children: React.ReactNode }) => {
  const pendingProbe = useRef<Promise<ReadonlySet<string>> | undefined>(undefined);

  const probe = useCallback<ProbeExemplarsAvailability>(({ onError, ...requestParams }) => {
    if (!pendingProbe.current) {
      const request = fetchMetricsWithExemplars(requestParams).catch((error: unknown) => {
        if (!isSuppressedFetchError(error)) {
          onError(error);
        }
        return NO_METRICS;
      });
      pendingProbe.current = request;

      // The exemplars stream is created on the first exemplar write, so an empty or failed
      // result may be transient. Only a non-empty result stays cached.
      void request.then((metricNames) => {
        if (metricNames.size === 0 && pendingProbe.current === request) {
          pendingProbe.current = undefined;
        }
      });
    }

    return pendingProbe.current;
  }, []);

  return (
    <ExemplarsAvailabilityContext.Provider value={probe}>
      {children}
    </ExemplarsAvailabilityContext.Provider>
  );
};

export const useExemplarsAvailabilityProbe = (): ProbeExemplarsAvailability => {
  const probe = useContext(ExemplarsAvailabilityContext);

  if (!probe) {
    throw new Error(
      'useExemplarsAvailabilityProbe must be used within an ExemplarsAvailabilityProvider'
    );
  }

  return probe;
};

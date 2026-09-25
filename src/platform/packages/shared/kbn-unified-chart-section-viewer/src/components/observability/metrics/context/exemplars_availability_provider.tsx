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
  type MetricsWithExemplars,
} from '../utils/fetch_metrics_with_exemplars';

export interface ProbeExemplarsAvailabilityParams extends FetchMetricsWithExemplarsParams {
  /**
   * Identifies the Discover fetch the caller belongs to (`fetchParams.lastReloadRequestTime`).
   * Every chart in one fetch shares a single probe; a new id starts a new probe, so a metric
   * that gains its first exemplar is picked up on the next refresh.
   */
  fetchId: number;
  /** Called at most once per probe request, never for aborts. */
  onError: (error: unknown) => void;
}

export type ProbeExemplarsAvailability = (
  params: ProbeExemplarsAvailabilityParams
) => Promise<MetricsWithExemplars>;

const NO_METRICS: MetricsWithExemplars = new Map();

const ExemplarsAvailabilityContext = createContext<ProbeExemplarsAvailability | undefined>(
  undefined
);

interface CachedProbe {
  fetchId: number;
  request: Promise<MetricsWithExemplars>;
}

/**
 * Shares one exemplars availability probe between every chart in the grid for each Discover
 * fetch. The probe never rejects: a failure is reported once through `onError` and resolves to
 * an empty set.
 */
export const ExemplarsAvailabilityProvider = ({ children }: { children: React.ReactNode }) => {
  const cachedProbe = useRef<CachedProbe | undefined>(undefined);

  const probe = useCallback<ProbeExemplarsAvailability>(
    ({ fetchId, onError, ...requestParams }) => {
      const cached = cachedProbe.current;
      if (cached?.fetchId === fetchId) {
        return cached.request;
      }

      const request = fetchMetricsWithExemplars(requestParams).catch((error: unknown) => {
        if (!isSuppressedFetchError(error)) {
          onError(error);
        }
        return NO_METRICS;
      });
      const entry: CachedProbe = { fetchId, request };
      cachedProbe.current = entry;

      // The exemplars stream is created on the first exemplar write, so an empty or failed
      // result may be transient. Only a non-empty result stays cached for this fetch.
      void request.then((metricsByStream) => {
        if (metricsByStream.size === 0 && cachedProbe.current === entry) {
          cachedProbe.current = undefined;
        }
      });

      return request;
    },
    []
  );

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

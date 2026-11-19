/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { createContext, useCallback, useEffect, useMemo } from 'react';
import { RequestAdapter } from '@kbn/inspector-plugin/common';

export interface TrackRequestResult<T> {
  data: T;
  request: object;
  response: object;
}

export interface ChartSectionInspectorContextValue {
  /**
   * The underlying RequestAdapter instance. Pass this to setLensRequestAdapter
   * so the Inspector can display chart section requests.
   */
  requestAdapter: RequestAdapter;

  /**
   * Wraps a fetch function with RequestAdapter lifecycle management.
   * Handles reset, start, json, ok on success, and error on failure.
   *
   * @param name - The display name for the request in the Inspector
   * @param description - A description of the request shown in the Inspector
   * @param fn - An async function that returns { data, request, response }
   * @returns The `data` value from the fn result
   */
  trackRequest: <T>(
    name: string,
    description: string,
    fn: () => Promise<TrackRequestResult<T>>
  ) => Promise<T>;
}

export const ChartSectionInspectorContext = createContext<ChartSectionInspectorContextValue | null>(
  null
);

interface ChartSectionInspectorProviderProps {
  children: React.ReactNode;
  /**
   * Optional callback for registering the request adapter with the Inspector.
   * When provided, the adapter is synced on mount and cleared on unmount.
   */
  setLensRequestAdapter?: (adapter: RequestAdapter | undefined) => void;
}

export const ChartSectionInspectorProvider = ({
  children,
  setLensRequestAdapter,
}: ChartSectionInspectorProviderProps) => {
  const requestAdapter = useMemo(() => new RequestAdapter(), []);

  useEffect(() => {
    setLensRequestAdapter?.(requestAdapter);
    return () => {
      setLensRequestAdapter?.(undefined);
    };
  }, [setLensRequestAdapter, requestAdapter]);

  const trackRequest = useCallback(
    async <T,>(
      name: string,
      description: string,
      fn: () => Promise<TrackRequestResult<T>>
    ): Promise<T> => {
      requestAdapter.reset();
      const responder = requestAdapter.start(name, { description });
      try {
        const { data, request, response } = await fn();
        responder.json(request);
        responder.ok({ json: response });
        return data;
      } catch (e) {
        responder.error({ json: e });
        throw e;
      }
    },
    [requestAdapter]
  );

  const value = useMemo(() => ({ requestAdapter, trackRequest }), [requestAdapter, trackRequest]);

  return (
    <ChartSectionInspectorContext.Provider value={value}>
      {children}
    </ChartSectionInspectorContext.Provider>
  );
};

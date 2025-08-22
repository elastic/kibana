/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useCallback } from 'react';

import type { Connector } from '../case_summary';

export interface UseGetConnectorsParams {
  http: {
    get: (path: string) => Promise<{ connectors: Connector[] }>;
  };
}

// TODO: this should be a constant in a package with other URLS from
// @kbn/cases-plugin.  Currently not represented anywhere in the codebase.
const CASES_INTERNAL_INFERENCE_CONNECTORS_URL = '/internal/inference/connectors';

export function useGetConnectors({ http }: UseGetConnectorsParams) {
  const [isLoading, setIsLoading] = useState(false);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const getConnectors = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await http.get(CASES_INTERNAL_INFERENCE_CONNECTORS_URL);
      setConnectors(response.connectors);
    } catch (err) {
      setError(err as Error);
      setConnectors([]);
    } finally {
      setIsLoading(false);
    }
  }, [http]);

  return { isLoading, connectors, error, getConnectors };
}

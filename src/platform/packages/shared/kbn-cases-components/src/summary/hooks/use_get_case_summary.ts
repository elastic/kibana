/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useState, useCallback } from 'react';

export interface UseGetCaseSummaryParams {
  http: {
    get: (path: string, options: { query: { connectorId?: string } }) => Promise<string>;
  };
}

interface UseGetCaseSummaryApiOptions {
  caseId: string;
  connectorId?: string;
}

// TODO: this should be a constant in a package.  Currently represented
// by CASES_INTERNAL_URL in @kbn/cases-plugin/common/constants which
// cannot be accessed by any package.
const CASES_INTERNAL_URL = '/internal/cases';

export function useGetCaseSummary({ http }: UseGetCaseSummaryParams) {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);

  const getCaseSummary = useCallback(
    async ({ caseId, connectorId }: UseGetCaseSummaryApiOptions) => {
      const apiPath = `${CASES_INTERNAL_URL}/${caseId}/summary`;
      setIsLoading(true);
      setError(null);
      try {
        const response = await http.get(apiPath, { query: { connectorId } });
        setSummary(response);
      } catch (err) {
        setError(err as Error);
        setSummary('');
      } finally {
        setIsLoading(false);
      }
    },
    [http]
  );

  return { isLoading, summary, error, getCaseSummary };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { getEditorExtensions } from '@kbn/esql-utils';
import { ESQL_CLASSIC_SOLUTION_ID } from '@kbn/esql-types';
import type { ESQLRegistrySolutionId, RecommendedQuery } from '@kbn/esql-types';
import type { QueryTemplate } from '@kbn/esql-language';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

const toQueryTemplate = ({ name, query, description }: RecommendedQuery): QueryTemplate => ({
  label: name,
  description: description ?? '',
  queryString: query,
});

export const useExtensionQueries = ({
  sourceQuery,
  isEnabled,
}: {
  sourceQuery?: string;
  isEnabled: boolean;
}): { queries: QueryTemplate[]; isLoading: boolean } => {
  const { core } = useDiscoverServices();
  const activeSolutionNavId = useObservable(core.chrome.getActiveSolutionNavId$());
  const solutionId = (activeSolutionNavId as ESQLRegistrySolutionId) ?? ESQL_CLASSIC_SOLUTION_ID;
  const [queries, setQueries] = useState<QueryTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(isEnabled);

  useEffect(() => {
    if (!isEnabled) {
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsLoading(true);

    // A source followed by a space counts as complete, so the registry also returns the queries registered for it.
    getEditorExtensions(
      core.http,
      sourceQuery ? `${sourceQuery} ` : '',
      solutionId,
      abortController.signal
    )
      .then((extensions) => {
        if (abortController.signal.aborted) return;
        setQueries((extensions?.recommendedQueries ?? []).map(toQueryTemplate));
        setIsLoading(false);
      })
      .catch(() => {
        if (abortController.signal.aborted) return;
        setQueries([]);
        setIsLoading(false);
      });

    return () => abortController.abort();
  }, [core.http, sourceQuery, isEnabled, solutionId]);

  return { queries, isLoading };
};

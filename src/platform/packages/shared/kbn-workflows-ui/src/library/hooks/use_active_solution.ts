/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { of } from 'rxjs';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useObservable } from '@kbn/use-observable';

const SOLUTION_ID_MAP: Record<string, string> = {
  oblt: 'observability',
  es: 'search',
  security: 'security',
};

export function useActiveSolution(): string | undefined {
  const { chrome } = useKibana().services;

  const solutionNavId = useObservable(
    chrome?.getActiveSolutionNavId$() ?? of(null),
    chrome?.getActiveSolutionNavId() ?? null
  );

  if (!solutionNavId) {
    return undefined;
  }
  return SOLUTION_ID_MAP[solutionNavId] ?? solutionNavId;
}

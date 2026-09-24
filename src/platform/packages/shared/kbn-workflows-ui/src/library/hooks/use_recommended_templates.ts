/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { recommendTemplates, type RecommendedTemplate } from '../lib/recommend_templates';
import { useActiveSolution } from './use_active_solution';
import { useCatalog } from './use_catalog';

export interface UseRecommendedTemplatesResult {
  readonly recommendations: RecommendedTemplate[];
  readonly isLoading: boolean;
  readonly isError: boolean;
}

/**
 * Loads the template catalog and returns ranked recommendations with reason
 * metadata. The UI must render reasons from this output — it must not invent
 * environment-awareness claims.
 */
export function useRecommendedTemplates(): UseRecommendedTemplatesResult {
  const activeSolution = useActiveSolution();
  const { allTemplates, isLoading, isError } = useCatalog();

  const recommendations = useMemo(
    () =>
      recommendTemplates({
        templates: allTemplates,
        signals: { solution: activeSolution },
      }),
    [allTemplates, activeSolution]
  );

  return { recommendations, isLoading, isError };
}

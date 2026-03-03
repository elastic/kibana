/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import type { CPSProject, ProjectsData } from '../types';

export interface UseFetchProjectsResult {
  originProject: CPSProject | null;
  linkedProjects: CPSProject[];
  isLoading: boolean;
  error: Error | null;
}

const INITIAL_STATE: UseFetchProjectsResult = {
  originProject: null,
  linkedProjects: [],
  isLoading: true,
  error: null,
};

/**
 * Hook for fetching projects data from CPSManager.
 * Uses a single state object to batch all updates into one re-render per fetch cycle.
 */
export const useFetchProjects = (
  fetchProjects: (routing?: ProjectRouting) => Promise<ProjectsData | null>,
  routing?: ProjectRouting
): UseFetchProjectsResult => {
  const [state, setState] = useState<UseFetchProjectsResult>(INITIAL_STATE);

  useEffect(() => {
    let isMounted = true;
    setState((prev) => (prev.isLoading ? prev : { ...prev, isLoading: true, error: null }));

    fetchProjects(routing)
      .then((projectsData) => {
        if (isMounted) {
          setState({
            originProject: projectsData?.origin ?? null,
            linkedProjects: projectsData?.linkedProjects ?? [],
            isLoading: false,
            error: null,
          });
        }
      })
      .catch((err) => {
        if (isMounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fetchProjects, routing]);

  return state;
};

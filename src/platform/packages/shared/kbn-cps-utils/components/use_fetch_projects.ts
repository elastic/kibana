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

/**
 * Hook for fetching projects data from CPSManager.
 * Returns loading/error states alongside the fetched data.
 */
export const useFetchProjects = (
  fetchProjects: (routing?: ProjectRouting) => Promise<ProjectsData | null>,
  routing?: ProjectRouting
): UseFetchProjectsResult => {
  const [originProject, setOriginProject] = useState<CPSProject | null>(null);
  const [linkedProjects, setLinkedProjects] = useState<CPSProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchProjects(routing)
      .then((projectsData) => {
        if (isMounted) {
          setOriginProject(projectsData?.origin ?? null);
          setLinkedProjects(projectsData?.linkedProjects ?? []);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fetchProjects, routing]);

  return { originProject, linkedProjects, isLoading, error };
};

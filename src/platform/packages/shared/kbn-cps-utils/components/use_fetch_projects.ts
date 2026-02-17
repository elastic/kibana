/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import type { CPSProject, ProjectsData } from '../types';

/**
 * Hook for fetching projects data from CPSManager
 */
export const useFetchProjects = (fetchProjects: () => Promise<ProjectsData | null>) => {
  const [originProject, setOriginProject] = useState<CPSProject | null>(null);
  const [linkedProjects, setLinkedProjects] = useState<CPSProject[]>([]);

  useEffect(() => {
    let isMounted = true;

    fetchProjects()
      .then((projectsData) => {
        if (isMounted && projectsData) {
          setOriginProject(projectsData.origin);
          setLinkedProjects(projectsData.linkedProjects);
        }
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch projects:', error);
      });

    return () => {
      isMounted = false;
    };
  }, [fetchProjects]);

  return { originProject, linkedProjects };
};

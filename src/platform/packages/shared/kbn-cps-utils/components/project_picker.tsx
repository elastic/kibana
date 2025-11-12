/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import type { CPSProject, ICPSManager } from '../types';
import { ProjectPickerComponent } from './project_picker_component';

/**
 * Hook for fetching projects data from CPSManager
 */
export const useFetchProjects = (cpsManager: ICPSManager) => {
  const [originProject, setOriginProject] = useState<CPSProject | null>(null);
  const [linkedProjects, setLinkedProjects] = useState<CPSProject[]>([]);

  useEffect(() => {
    let isMounted = true;

    cpsManager
      .fetchProjects()
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
  }, [cpsManager]);

  return { originProject, linkedProjects };
};

/**
 * Hook for interacting with project routing observable
 * Subscribes to routing changes and provides setter function
 */
export const useProjectRouting = (cpsManager: ICPSManager) => {
  const [projectRouting, setProjectRouting] = useState<ProjectRouting | undefined>(
    cpsManager.getProjectRouting()
  );

  useEffect(() => {
    const subscription = cpsManager.getProjectRouting$().subscribe((newRouting) => {
      setProjectRouting(newRouting);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [cpsManager]);

  const updateProjectRouting = (newRouting: ProjectRouting) => {
    cpsManager.setProjectRouting(newRouting);
  };

  return { projectRouting, updateProjectRouting };
};

export interface ProjectPickerProps {
  cpsManager: ICPSManager;
}

export const ProjectPicker: React.FC<ProjectPickerProps> = ({ cpsManager }) => {
  const { originProject, linkedProjects } = useFetchProjects(cpsManager);
  const { projectRouting, updateProjectRouting } = useProjectRouting(cpsManager);

  // do not render the component if required props are missing or there aren't linked projects
  if (!originProject || linkedProjects.length === 0) {
    return null;
  }

  return (
    <ProjectPickerComponent
      projectRouting={projectRouting}
      onProjectRoutingChange={updateProjectRouting}
      originProject={originProject}
      linkedProjects={linkedProjects}
    />
  );
};

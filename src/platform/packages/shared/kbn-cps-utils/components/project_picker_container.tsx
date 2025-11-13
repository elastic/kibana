/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import type { ICPSManager } from '../types';
import { ProjectPicker } from './project_picker';

interface ProjectPickerContainerProps {
  cpsManager: ICPSManager;
}

/**
 * Container component that connects ProjectPicker to CPSManager
 * Handles observable subscriptions and provides bound fetchProjects
 */
export const ProjectPickerContainer: React.FC<ProjectPickerContainerProps> = ({ cpsManager }) => {
  const { projectRouting, updateProjectRouting } = useProjectRouting(cpsManager);

  return (
    <ProjectPicker
      projectRouting={projectRouting}
      onProjectRoutingChange={updateProjectRouting}
      fetchProjects={cpsManager.fetchProjects.bind(cpsManager)}
    />
  );
};

/**
 * Hook for interacting with project routing observable
 * Subscribes to routing changes and provides setter function
 */
const useProjectRouting = (cpsManager: ICPSManager) => {
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

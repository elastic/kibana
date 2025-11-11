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

export interface ProjectPickerProps {
  cpsManager: ICPSManager;
}

export const ProjectPicker: React.FC<ProjectPickerProps> = ({ cpsManager }) => {
  const [originProject, setOriginProject] = useState<CPSProject | null>(null);
  const [linkedProjects, setLinkedProjects] = useState<CPSProject[]>([]);
  const [projectRouting, setProjectRouting] = useState<ProjectRouting | undefined>(
    cpsManager.getProjectRouting()
  );

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

    const subscription = cpsManager.getProjectRouting$().subscribe((newRouting) => {
      if (isMounted) {
        setProjectRouting(newRouting);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [cpsManager]);

  // do not render the component if required props are missing or there aren't linked projects
  if (!originProject || linkedProjects.length === 0) {
    return null;
  }

  return (
    <ProjectPickerComponent
      projectRouting={projectRouting}
      onProjectRoutingChange={(newRouting: ProjectRouting) => {
        cpsManager.setProjectRouting(newRouting);
      }}
      originProject={originProject}
      linkedProjects={linkedProjects}
    />
  );
};

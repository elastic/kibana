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
import type { CPSPluginStart, Project } from '@kbn/cps/public';
import { ProjectPickerComponent } from './project_picker_component';

export interface ProjectPickerProps {
  projectRouting?: ProjectRouting;
  onProjectRoutingChange?: (projectRouting: ProjectRouting) => void;
  wrappingContainer?: (children: React.ReactNode) => React.ReactElement;
  cps?: CPSPluginStart;
}

export const ProjectPicker: React.FC<ProjectPickerProps> = ({
  projectRouting,
  onProjectRoutingChange,
  wrappingContainer = (children) => children as React.ReactElement,
  cps,
}) => {
  const [originProject, setOriginProject] = useState<Project | null>(null);
  const [linkedProjects, setLinkedProjects] = useState<Project[]>([]);
  console.log('CPS Plugin Start:', cps);
  useEffect(() => {
    // Only fetch projects in serverless environments where cpsManager is available
    if (!cps?.cpsManager) return;

    cps.cpsManager.fetchProjects().then((projectsData) => {
      setOriginProject(projectsData.origin);
      setLinkedProjects(projectsData.linkedProjects);
    });
  }, [cps]);

  // do not render the component if cpsManager is not available or required props are missing or there aren't linked projects
  if (
    !cps?.cpsManager ||
    !onProjectRoutingChange ||
    !originProject ||
    linkedProjects.length === 0
  ) {
    return null;
  }

  return wrappingContainer(
    <ProjectPickerComponent
      projectRouting={projectRouting}
      onProjectRoutingChange={onProjectRoutingChange}
      originProject={originProject}
      linkedProjects={linkedProjects}
    />
  );
};

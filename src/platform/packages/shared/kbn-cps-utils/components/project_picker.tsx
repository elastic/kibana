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
import type { CPSProject } from '@kbn/cps/common/types';
import { ProjectPickerComponent } from './project_picker_component';

export interface ProjectPickerProps {
  projectRouting?: ProjectRouting;
  onProjectRoutingChange?: (projectRouting: ProjectRouting) => void;
  wrappingContainer?: (children: React.ReactNode) => React.ReactElement;
  cpsManager?: {
    fetchProjects: () => Promise<{ origin: CPSProject | null; linkedProjects: CPSProject[] }>;
  };
}

export const ProjectPicker: React.FC<ProjectPickerProps> = ({
  projectRouting,
  onProjectRoutingChange,
  wrappingContainer = (children) => children as React.ReactElement,
  cpsManager,
}) => {
  const [originProject, setOriginProject] = useState<CPSProject | null>(null);
  const [linkedProjects, setLinkedProjects] = useState<CPSProject[]>([]);

  useEffect(() => {
    // Only fetch projects in serverless environments where cpsManager is available
    if (!cpsManager) return;

    cpsManager.fetchProjects().then((projectsData) => {
      if (projectsData) {
        setOriginProject(projectsData.origin);
        setLinkedProjects(projectsData.linkedProjects);
      }
    });
  }, [cpsManager]);

  // do not render the component if cpsManager is not available or required props are missing or there aren't linked projects
  if (!cpsManager || !onProjectRoutingChange || !originProject || linkedProjects.length === 0) {
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

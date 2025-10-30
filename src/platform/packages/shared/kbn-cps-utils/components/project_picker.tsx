
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
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CPSPluginStart } from '@kbn/cps/public';
import { identity } from 'lodash';
import { ProjectPickerComponent, type Project } from './project_picker_component';

interface CPSServices {
  cps: CPSPluginStart;
}

export interface ProjectPickerProps {
  projectRouting?: ProjectRouting;
  onProjectRoutingChange?: (projectRouting: ProjectRouting) => void;
  wrappingContainer?: (children: React.ReactNode) => React.ReactElement;
}

export const ProjectPicker: React.FC<ProjectPickerProps> = ({
  projectRouting,
  onProjectRoutingChange,
  wrappingContainer = identity,
}) => {
  const { cps } = useKibana<CPSServices>().services;
  const [originProject, setOriginProject] = useState<Project | null>(null);
  const [linkedProjects, setLinkedProjects] = useState<Project[]>([]);

  useEffect(() => {
    // Only fetch projects in serverless environments where cpsManager is available
    if (!cps?.cpsManager) return;

    const subscription = cps.cpsManager.projects$.subscribe((projectsData: { origin: Project | null; linkedProjects: Project[] }) => {
      setOriginProject(projectsData.origin);
      setLinkedProjects(projectsData.linkedProjects);
    });

    return () => subscription.unsubscribe();
  }, [cps]);

  if (!cps?.cpsManager) return null;
  if (!onProjectRoutingChange) return null;
  if (!originProject || linkedProjects.length === 0) return null;
  console.log('Rendering ProjectPicker', { projectRouting, originProject, linkedProjects });

  return wrappingContainer(
    <ProjectPickerComponent
      projectRouting={projectRouting}
      onProjectRoutingChange={onProjectRoutingChange}
      originProject={originProject}
      linkedProjects={linkedProjects}
    />
  );
};

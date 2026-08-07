/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import type { ProjectRouting } from '@kbn/es-query';
import { ProjectPickerFrame, ProjectPickerList } from './blocks';
import {
  ProjectPickerStateProvider,
  type ProjectPickerStateProviderProps,
  useProjectPickerState,
} from './state';
import { getProjectRoutingFromSelectedProjectIds } from './utils/project_routing';

export interface ProjectPickerProps
  extends Omit<ProjectPickerStateProviderProps, 'children' | 'initialProjectRouting'> {
  onProjectRoutingChange?: (projectRouting: ProjectRouting) => void;
  projectRouting?: ProjectRouting;
}

const ProjectPickerRoutingObserver = ({
  onProjectRoutingChange,
  originProjectId,
  projectRouting,
}: Pick<ProjectPickerProps, 'onProjectRoutingChange' | 'originProjectId' | 'projectRouting'>) => {
  const { availableProjects, selectedProjects } = useProjectPickerState();

  useEffect(() => {
    if (!onProjectRoutingChange) {
      return;
    }

    const nextProjectRouting = getProjectRoutingFromSelectedProjectIds({
      availableProjects: Array.from(availableProjects.values()),
      originProjectId,
      selectedProjectIds: selectedProjects,
    });

    if (nextProjectRouting !== projectRouting) {
      onProjectRoutingChange(nextProjectRouting);
    }
  }, [
    availableProjects,
    onProjectRoutingChange,
    originProjectId,
    projectRouting,
    selectedProjects,
  ]);

  return null;
};

export function ProjectPicker({
  availableProjects,
  isReadOnly,
  onProjectRoutingChange,
  originProjectId,
  projectRouting,
  requiredProjectId,
}: ProjectPickerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <ProjectPickerStateProvider
      availableProjects={availableProjects}
      initialProjectRouting={projectRouting}
      isReadOnly={isReadOnly}
      originProjectId={originProjectId}
      requiredProjectId={requiredProjectId}
    >
      <ProjectPickerRoutingObserver
        onProjectRoutingChange={onProjectRoutingChange}
        originProjectId={originProjectId}
        projectRouting={projectRouting}
      />
      <ProjectPickerFrame maxBodyHeight={500} scrollContainerRef={scrollContainerRef}>
        <ProjectPickerList scrollContainerRef={scrollContainerRef} />
      </ProjectPickerFrame>
    </ProjectPickerStateProvider>
  );
}

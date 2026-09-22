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
import { PROJECT_ROUTING } from '@kbn/cps-common';
import { ProjectPickerFrame, ProjectPickerList } from './blocks';
import {
  ProjectPickerStateProvider,
  type ProjectPickerStateProviderProps,
  useProjectPickerState,
} from './state';
import { projectRoutingCodec } from './utils/project_routing_codec';

export interface ProjectPickerProps
  extends Omit<ProjectPickerStateProviderProps, 'children' | 'initialProjectRouting'> {
  onProjectRoutingChange?: (projectRouting: ProjectRouting) => void;
  projectRouting?: ProjectRouting;
}

const ProjectPickerRoutingObserver = ({
  onProjectRoutingChange,
  projectRouting,
}: Pick<ProjectPickerProps, 'onProjectRoutingChange' | 'projectRouting'>) => {
  const { availableProjects, excludedOverrides, filterExpressions, selectedProjects } =
    useProjectPickerState();

  useEffect(() => {
    if (!onProjectRoutingChange) {
      return;
    }

    const allProjectIds = Array.from(availableProjects.keys());
    const activeFilterExpressions = Array.from(filterExpressions.values())
      .filter((entry) => entry.enabled)
      .map(({ expression }) => expression);
    const hasActiveFilters = activeFilterExpressions.length > 0;
    const hasExcludedOverrides = excludedOverrides.length > 0;
    const isAllProjectsSelected =
      selectedProjects.length === 0 || selectedProjects.length === allProjectIds.length;
    const nextProjectRouting =
      !hasActiveFilters && !hasExcludedOverrides && isAllProjectsSelected
        ? PROJECT_ROUTING.ALL
        : projectRoutingCodec.encode({
            excludedProjectIds: excludedOverrides,
            filterExpressions: activeFilterExpressions,
            selectedProjectIds: selectedProjects,
            projectRoutingStrategy: hasActiveFilters ? 'dynamic' : 'snapshot',
          });

    if (nextProjectRouting !== projectRouting) {
      onProjectRoutingChange(nextProjectRouting);
    }
  }, [
    availableProjects,
    excludedOverrides,
    filterExpressions,
    onProjectRoutingChange,
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
}: ProjectPickerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <ProjectPickerStateProvider
      availableProjects={availableProjects}
      initialProjectRouting={projectRouting}
      isReadOnly={isReadOnly}
      originProjectId={originProjectId}
    >
      <ProjectPickerRoutingObserver
        onProjectRoutingChange={onProjectRoutingChange}
        projectRouting={projectRouting}
      />
      <ProjectPickerFrame maxBodyHeight={500} scrollContainerRef={scrollContainerRef}>
        <ProjectPickerList scrollContainerRef={scrollContainerRef} />
      </ProjectPickerFrame>
    </ProjectPickerStateProvider>
  );
}

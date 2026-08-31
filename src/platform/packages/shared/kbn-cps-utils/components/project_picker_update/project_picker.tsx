/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, type ComponentProps } from 'react';
import { ProjectPickerFrame, ProjectPickerList } from './blocks';
import { ProjectPickerStateProvider, type ProjectPickerStateProviderProps } from './state';

export function ProjectPicker({
  availableProjects,
  controlsState,
  originProjectId,
  projectRouting,
  onProjectRoutingChange,
  fetchProjectsByRouting,
  projectRoutingStrategy,
}: Omit<
  ProjectPickerStateProviderProps,
  'children' | 'currentProjectRoutingGetter' | 'defaultProjectRoutingGetter'
> & { projectRouting: string }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const initialProjectRouting = useRef(projectRouting);
  const currentProjectRouting = useRef(projectRouting);
  currentProjectRouting.current = projectRouting;

  const defaultProjectRoutingGetter = useCallback(() => initialProjectRouting.current, []);
  const currentProjectRoutingGetter = useCallback(() => currentProjectRouting.current, []);

  return (
    <ProjectPickerStateProvider
      defaultProjectRoutingGetter={defaultProjectRoutingGetter}
      currentProjectRoutingGetter={currentProjectRoutingGetter}
      availableProjects={availableProjects}
      controlsState={controlsState}
      originProjectId={originProjectId}
      onProjectRoutingChange={onProjectRoutingChange}
      fetchProjectsByRouting={fetchProjectsByRouting}
      projectRoutingStrategy={projectRoutingStrategy}
    >
      <ProjectPickerFrame maxBodyHeight={500} scrollContainerRef={scrollContainerRef}>
        <ProjectPickerList scrollContainerRef={scrollContainerRef} />
      </ProjectPickerFrame>
    </ProjectPickerStateProvider>
  );
}

export type ProjectPickerProps = ComponentProps<typeof ProjectPicker>;

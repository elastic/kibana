/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { faker } from '@faker-js/faker';
import { action } from '@storybook/addon-actions';
import type { ProjectRouting } from '@kbn/es-query';
import type { CPSProject } from '../../../../types';
import { ProjectPickerList } from './list';
import { ProjectPickerStateProvider, type ProjectPickerStateProviderProps } from '../../state';

/**
 * Emulates a well-behaved consumer: every routing reported through `onProjectRoutingChange`
 * is fed back into `currentProjectRoutingGetter`, matching the provider's contract. With a
 * frozen getter, changes that re-encode to the getter's value (e.g. select-all after
 * exclusions) would be deduped and never reported.
 */
const RoutingRoundTripStateProvider = ({
  currentProjectRoutingGetter,
  onProjectRoutingChange,
  ...rest
}: ProjectPickerStateProviderProps) => {
  const routingRef = useRef<ProjectRouting | undefined>(currentProjectRoutingGetter());

  const roundTrippedGetter = useCallback(() => routingRef.current, []);

  const handleProjectRoutingChange = useCallback(
    (routing: ProjectRouting) => {
      routingRef.current = routing;
      onProjectRoutingChange(routing);
    },
    [onProjectRoutingChange]
  );

  return (
    <ProjectPickerStateProvider
      {...rest}
      currentProjectRoutingGetter={roundTrippedGetter}
      onProjectRoutingChange={handleProjectRoutingChange}
    />
  );
};

const createProjects = (projectCount: number = 100): CPSProject[] => {
  return Array.from({ length: projectCount }, () => ({
    _id: faker.string.uuid(),
    _type: faker.helpers.arrayElement(['security', 'observability', 'elasticsearch']),
    _alias: faker.company.name(),
    _organisation: faker.company.name(),
    _region: faker.helpers.arrayElement(['us-east-1', 'us-west-1', 'eu-west-1']),
    _csp: faker.helpers.arrayElement(['AWS', 'Azure', 'GCP']),
  }));
};

export default {
  title: 'Project Picker/Blocks/List',
  component: ProjectPickerList,
} satisfies Meta<typeof ProjectPickerList>;

export const ProjectPickerListItemStory: StoryObj<
  Pick<
    ProjectPickerStateProviderProps,
    | 'availableProjects'
    | 'controlsState'
    | 'defaultProjectRoutingGetter'
    | 'currentProjectRoutingGetter'
    | 'onProjectRoutingChange'
    | 'originProjectId'
  > &
    ComponentProps<typeof ProjectPickerList>
> = {
  name: 'ProjectPickerListItem',
  args: {
    controlsState: 'enabled',
    availableProjects: createProjects(10),
    defaultProjectRoutingGetter: () => '_alias:origin',
    currentProjectRoutingGetter: () => '_alias:origin',
    onProjectRoutingChange: action('onProjectRoutingChange'),
    get originProjectId(): string {
      return this.availableProjects![0]._id;
    },
  },
  render: ({
    availableProjects,
    controlsState,
    defaultProjectRoutingGetter,
    currentProjectRoutingGetter,
    onProjectRoutingChange,
    originProjectId,
    ...props
  }) => (
    <RoutingRoundTripStateProvider
      availableProjects={availableProjects}
      controlsState={controlsState}
      originProjectId={originProjectId}
      defaultProjectRoutingGetter={defaultProjectRoutingGetter}
      currentProjectRoutingGetter={currentProjectRoutingGetter}
      onProjectRoutingChange={onProjectRoutingChange}
      fetchProjectsByRouting={async () => ({
        origin: availableProjects[0] ?? null,
        linkedProjects: availableProjects.slice(1),
      })}
    >
      <ProjectPickerList {...props} />
    </RoutingRoundTripStateProvider>
  ),
};

export const ProjectPickerListItemHiddenControlsStory: StoryObj<
  Pick<
    ProjectPickerStateProviderProps,
    | 'availableProjects'
    | 'controlsState'
    | 'defaultProjectRoutingGetter'
    | 'currentProjectRoutingGetter'
    | 'onProjectRoutingChange'
    | 'originProjectId'
  > &
    ComponentProps<typeof ProjectPickerList>
> = {
  name: 'ProjectPickerListItemHiddenControls',
  args: {
    controlsState: 'hidden',
    availableProjects: createProjects(10),
    defaultProjectRoutingGetter: () => '_alias:origin',
    currentProjectRoutingGetter: () => '_alias:origin',
    onProjectRoutingChange: action('onProjectRoutingChange'),
    get originProjectId(): string {
      return this.availableProjects![0]._id;
    },
  },
  render: ({
    availableProjects,
    controlsState,
    defaultProjectRoutingGetter,
    currentProjectRoutingGetter,
    onProjectRoutingChange,
    originProjectId,
    ...props
  }) => (
    <ProjectPickerStateProvider
      availableProjects={availableProjects}
      controlsState={controlsState}
      originProjectId={originProjectId}
      defaultProjectRoutingGetter={defaultProjectRoutingGetter}
      currentProjectRoutingGetter={currentProjectRoutingGetter}
      onProjectRoutingChange={onProjectRoutingChange}
      fetchProjectsByRouting={async () => ({
        origin: availableProjects[0] ?? null,
        linkedProjects: availableProjects.slice(1),
      })}
    >
      <ProjectPickerList {...props} />
    </ProjectPickerStateProvider>
  ),
};

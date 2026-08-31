/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { StoryObj, Meta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { faker } from '@faker-js/faker';
import { ProjectPickerButton, type ProjectPickerButtonProps } from './button';
import { ProjectPickerStateProvider, type ProjectPickerStateProviderProps } from '../../state';

/**
 * @description story for the project picker button component
 */
export default {
  component: ProjectPickerButton,
  title: 'Project Picker/Blocks/Button',
  argTypes: {
    size: {
      control: 'select',
      options: ['s', 'm', 'l'],
    },
  },
} satisfies Meta<typeof ProjectPickerButton>;

export const ProjectPickerButtonStory: StoryObj<
  Pick<
    ProjectPickerStateProviderProps,
    | 'availableProjects'
    | 'defaultProjectRoutingGetter'
    | 'currentProjectRoutingGetter'
    | 'onProjectRoutingChange'
    | 'originProjectId'
  > &
    ProjectPickerButtonProps
> = {
  name: 'ProjectPickerButton',
  argTypes: {
    size: {
      control: 'select',
      options: ['s', 'm', 'l'],
    },
  },
  args: {
    size: 's',
    availableProjects: Array.from({ length: 10 }, () => ({
      _id: faker.string.uuid(),
      _type: faker.helpers.arrayElement(['security', 'observability', 'elasticsearch']),
      _alias: faker.company.name(),
      _organisation: faker.company.name(),
      _region: faker.helpers.arrayElement(['us-east-1', 'us-west-1', 'eu-west-1']),
      _csp: faker.helpers.arrayElement(['AWS', 'Azure', 'GCP']),
    })),
    defaultProjectRoutingGetter: () => '_alias:origin',
    currentProjectRoutingGetter: () => '_alias:origin',
    onProjectRoutingChange: action('onProjectRoutingChange'),
    get originProjectId(): string {
      return this.availableProjects![0]._id;
    },
  },
  render: ({
    availableProjects,
    defaultProjectRoutingGetter,
    currentProjectRoutingGetter,
    onProjectRoutingChange,
    originProjectId,
    ...props
  }) => (
    <ProjectPickerStateProvider
      availableProjects={availableProjects}
      originProjectId={originProjectId}
      defaultProjectRoutingGetter={defaultProjectRoutingGetter}
      currentProjectRoutingGetter={currentProjectRoutingGetter}
      onProjectRoutingChange={onProjectRoutingChange}
      fetchProjectsByRouting={async () => ({
        origin: availableProjects?.[0] ?? null,
        linkedProjects: availableProjects?.slice(1) ?? [],
      })}
    >
      <ProjectPickerButton {...props} />
    </ProjectPickerStateProvider>
  ),
};

export const ProjectPickerButtonDisabledStory: StoryObj<
  Pick<
    ProjectPickerStateProviderProps,
    | 'availableProjects'
    | 'defaultProjectRoutingGetter'
    | 'currentProjectRoutingGetter'
    | 'onProjectRoutingChange'
    | 'originProjectId'
  > &
    ProjectPickerButtonProps
> = {
  name: 'ProjectPickerButtonDisabled',
  args: {
    size: 's',
    isDisabled: true,
    availableProjects: Array.from({ length: 10 }, () => ({
      _id: faker.string.uuid(),
      _type: faker.helpers.arrayElement(['security', 'observability', 'elasticsearch']),
      _alias: faker.company.name(),
      _organisation: faker.company.name(),
      _region: faker.helpers.arrayElement(['us-east-1', 'us-west-1', 'eu-west-1']),
      _csp: faker.helpers.arrayElement(['AWS', 'Azure', 'GCP']),
    })),
    defaultProjectRoutingGetter: () => '_alias:origin',
    currentProjectRoutingGetter: () => '_alias:origin',
    onProjectRoutingChange: action('onProjectRoutingChange'),
    get originProjectId(): string {
      return this.availableProjects![0]._id;
    },
  },
  render: ({
    defaultProjectRoutingGetter,
    currentProjectRoutingGetter,
    onProjectRoutingChange,
    availableProjects,
    originProjectId,
    ...props
  }) => (
    <ProjectPickerStateProvider
      availableProjects={availableProjects}
      originProjectId={originProjectId}
      defaultProjectRoutingGetter={defaultProjectRoutingGetter}
      currentProjectRoutingGetter={currentProjectRoutingGetter}
      onProjectRoutingChange={onProjectRoutingChange}
      fetchProjectsByRouting={async () => ({
        origin: availableProjects?.[0] ?? null,
        linkedProjects: availableProjects?.slice(1) ?? [],
      })}
    >
      <ProjectPickerButton {...props} />
    </ProjectPickerStateProvider>
  ),
};

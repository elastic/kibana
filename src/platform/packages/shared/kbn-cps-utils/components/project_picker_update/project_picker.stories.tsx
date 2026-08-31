/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState, type ComponentProps } from 'react';
import type { StoryObj, Meta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { faker } from '@faker-js/faker';
import type { ProjectRouting } from '@kbn/es-query';
import type { CPSProject } from '../../types';
import { ProjectPicker } from './project_picker';

/**
 * Emulates a well-behaved consumer: every routing reported through `onProjectRoutingChange`
 * is fed back into `projectRouting`.
 */
const RoutingRoundTripProjectPicker = ({
  projectRouting,
  onProjectRoutingChange,
  ...rest
}: ComponentProps<typeof ProjectPicker>) => {
  const [projectRoutingString, setProjectRoutingString] =
    useState<NonNullable<ProjectRouting>>(projectRouting);

  const handleProjectRoutingChange = useCallback(
    (routing: ProjectRouting) => {
      setProjectRoutingString(routing!);
      onProjectRoutingChange(routing);
    },
    [onProjectRoutingChange]
  );

  return (
    <ProjectPicker
      {...rest}
      projectRouting={projectRoutingString}
      onProjectRoutingChange={handleProjectRoutingChange}
    />
  );
};

const createProjects = (projectCount: number = 100): CPSProject[] => {
  return Array.from({ length: projectCount }, () => {
    const tagKeys = ['configVersion', 'costCenter', 'environment'] as const;
    const tagsValueMap: Record<(typeof tagKeys)[number], string[]> = {
      configVersion: ['1.0.0', '1.0.1', '1.0.2'],
      costCenter: ['r&d', 'finance', 'hr'],
      environment: ['dev', 'prod', 'staging'],
    };

    return {
      _id: faker.string.uuid(),
      _type: faker.helpers.arrayElement(['security', 'observability', 'elasticsearch']),
      _alias: faker.company.name(),
      _organisation: faker.company.name(),
      _region: faker.helpers.arrayElement(['us-east-1', 'us-west-1', 'eu-west-1']),
      _csp: faker.helpers.arrayElement(['AWS', 'Azure', 'GCP']),
      ...Array.from(new Array(faker.number.int({ min: 1, max: 10 }))).reduce((acc, _) => {
        const tagKey = faker.helpers.arrayElement(tagKeys);
        acc[tagKey] = faker.helpers.arrayElement(tagsValueMap[tagKey]);
        return acc;
      }, {}),
    };
  });
};

/**
 * @description story for the project picker button component
 */
export default {
  component: ProjectPicker,
  title: 'Project Picker/Picker',
} satisfies Meta<typeof ProjectPicker>;

const projectPickerStoryProjects = createProjects();

export const ProjectPickerStory: StoryObj<ComponentProps<typeof ProjectPicker>> = {
  name: 'ProjectPicker',
  argTypes: {
    projectRoutingStrategy: {
      control: 'select',
      options: ['dynamic', 'snapshot'],
    },
  },
  args: {
    projectRoutingStrategy: 'dynamic',
    availableProjects: projectPickerStoryProjects,
    projectRouting: '_alias:origin',
    onProjectRoutingChange: action('onProjectRoutingChange'),
    fetchProjectsByRouting: async (routing: ProjectRouting) => {
      action('fetchProjectsByRouting')(routing);

      return {
        origin: projectPickerStoryProjects[0],
        // TODO: attempt to filter from the actual routing value on the client
        linkedProjects: faker.helpers.arrayElements(projectPickerStoryProjects, {
          min: 10,
          max: 50,
        }),
      };
    },
    originProjectId: projectPickerStoryProjects[0]._id,
  },
  render: (props) => <RoutingRoundTripProjectPicker {...props} />,
};

const projectPickerReadOnlyStoryProjects = createProjects(50);

export const ProjectPickerReadOnlyStory: StoryObj<ComponentProps<typeof ProjectPicker>> = {
  name: 'ProjectPickerReadOnly',
  argTypes: {
    controlsState: {
      control: 'select',
      options: ['disabled', 'enabled', 'hidden'],
    },
  },
  args: {
    controlsState: 'disabled',
    availableProjects: projectPickerReadOnlyStoryProjects,
    projectRouting: '_alias:origin',
    onProjectRoutingChange: action('onProjectRoutingChange'),
    fetchProjectsByRouting: async (routing: ProjectRouting) => {
      action('fetchProjectsByRouting')(routing);

      return {
        origin: projectPickerReadOnlyStoryProjects[0],
        linkedProjects: faker.helpers.arrayElements(projectPickerReadOnlyStoryProjects, {
          min: 5,
          max: 35,
        }),
      };
    },
    originProjectId: projectPickerReadOnlyStoryProjects[0]._id,
  },
  render: (props) => <RoutingRoundTripProjectPicker {...props} />,
};

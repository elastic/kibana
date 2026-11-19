/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentProps } from 'react';
import React from 'react';
import type { StoryObj, Meta } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { faker } from '@faker-js/faker';
import { ProjectPicker as ProjectPickerPopover, TOUR_STORAGE_KEY } from './project_picker';
import type { CPSProject } from '../types';

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

export default {
  component: ProjectPickerPopover,
  title: 'Project Picker/Popover',
  decorators: [
    (Story) => {
      // prevents tour from being shown in our stories
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      return <Story />;
    },
  ],
} satisfies Meta<typeof ProjectPickerPopover>;

const projectPickerStoryProjects = createProjects();

export const ProjectPickerPopoverStory: StoryObj<ComponentProps<typeof ProjectPickerPopover>> = {
  name: 'ProjectPickerPopover',
  args: {
    onProjectRoutingChange(projectRouting) {
      action('onProjectRoutingChange')(projectRouting);
    },
    defaultProjectRoutingGetter: () => '_alias:origin',
    currentProjectRoutingGetter: () => '_alias:origin',
    fetchProjectsByRouting: async (projectRouting) => {
      action('fetchProjectsByRouting')(projectRouting);
      return {
        origin: projectPickerStoryProjects[0],
        linkedProjects: projectPickerStoryProjects.slice(1),
      };
    },
    totalProjectCount: projectPickerStoryProjects.length,
    maxBodyHeight: 400,
  },
  render: (args) => <ProjectPickerPopover {...args} />,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { faker } from '@faker-js/faker';
import { ProjectPickerList } from './list';
import { ProjectPickerStateProvider, type ProjectPickerStateProviderProps } from '../../state';

export default {
  title: 'Project Picker/Blocks/List',
  component: ProjectPickerList,
} satisfies Meta<typeof ProjectPickerList>;

export const ProjectPickerListItemStory: StoryObj<
  Pick<ProjectPickerStateProviderProps, 'availableProjects' | 'isReadOnly'> &
    ComponentProps<typeof ProjectPickerList>
> = {
  name: 'ProjectPickerListItem',
  argTypes: {
    isReadOnly: {
      control: {
        type: 'boolean',
      },
    },
  },
  args: {
    isReadOnly: false,
    availableProjects: Array.from({ length: 10 }, () => ({
      _id: faker.string.uuid(),
      _type: faker.helpers.arrayElement(['security', 'observability', 'elasticsearch']),
      _alias: faker.company.name(),
      _organisation: faker.company.name(),
      _region: faker.helpers.arrayElement(['us-east-1', 'us-west-1', 'eu-west-1']),
      _csp: faker.helpers.arrayElement(['AWS', 'Azure', 'GCP']),
    })),
  },
  render: ({ availableProjects, isReadOnly, ...props }) => (
    <ProjectPickerStateProvider availableProjects={availableProjects} isReadOnly={isReadOnly}>
      <ProjectPickerList {...props} />
    </ProjectPickerStateProvider>
  ),
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { faker } from '@faker-js/faker';
import type { Meta, StoryObj } from '@storybook/react';
import {
  ProjectPickerStateProvider,
  type ProjectPickerStateProviderProps,
} from '../../../../../state';
import { ProjectPickerFilterForm, type ProjectPickerFilterFormProps } from './filter_form';

export default {
  title: 'Project Picker/Blocks/Filter Box',
  component: ProjectPickerFilterForm,
} satisfies Meta<typeof ProjectPickerFilterForm>;

export const ProjectPickerFilterBoxStory: StoryObj<
  Pick<ProjectPickerStateProviderProps, 'availableProjects'> & ProjectPickerFilterFormProps
> = {
  name: 'ProjectPickerFilterBox',
  args: {
    availableProjects: Array.from({ length: 10 }, () => ({
      _id: faker.string.uuid(),
      _type: faker.helpers.arrayElement(['security', 'observability', 'elasticsearch']),
      _alias: faker.company.name(),
      _organisation: faker.company.name(),
      _region: faker.helpers.arrayElement(['us-east-1', 'us-west-1', 'eu-west-1']),
      _provider: faker.helpers.arrayElement(['AWS', 'Azure', 'GCP']),
    })),
  },
  render: ({ availableProjects, ...props }) => (
    <ProjectPickerStateProvider availableProjects={availableProjects}>
      <ProjectPickerFilterForm {...props} />
    </ProjectPickerStateProvider>
  ),
};

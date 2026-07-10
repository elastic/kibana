/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps } from 'react';
import type { StoryObj, Meta } from '@storybook/react';
import { faker } from '@faker-js/faker';
import { ProjectPicker } from './project_picker';

/**
 * @description story for the project picker button component
 */
export default {
  component: ProjectPicker,
  title: 'Project Picker/Picker',
  argTypes: {
    size: {
      control: 'select',
      options: ['s', 'm', 'l'],
    },
  },
} satisfies Meta<typeof ProjectPicker>;

export const ProjectPickerStory: StoryObj<ComponentProps<typeof ProjectPicker>> = {
  name: 'ProjectPicker',
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
  render: (props) => <ProjectPicker {...props} />,
};

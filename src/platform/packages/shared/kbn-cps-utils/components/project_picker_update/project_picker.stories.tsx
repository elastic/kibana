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
  render: () => <ProjectPicker />,
};

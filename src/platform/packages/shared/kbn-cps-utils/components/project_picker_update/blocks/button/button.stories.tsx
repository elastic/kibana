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
import { ProjectPickerButton, type ProjectPickerButtonProps } from './button';

/**
 * @description story for the project picker button component
 */
export default {
  component: ProjectPickerButton,
  title: 'ProjectPickerButton',
  argTypes: {
    size: {
      control: 'select',
      options: ['s', 'm', 'l'],
    },
  },
} satisfies Meta<typeof ProjectPickerButton>;

export const ProjectPickerButtonStory: StoryObj<ProjectPickerButtonProps> = {
  name: 'ProjectPickerButton',
  argTypes: {
    size: {
      control: 'select',
      options: ['s', 'm', 'l'],
    },
    filteredProjectsCount: {
      control: 'number',
    },
    totalProjectsCount: {
      control: 'number',
    },
  },
  args: {
    size: 's',
    filteredProjectsCount: 1000,
    totalProjectsCount: 10000,
  },
  render: (args) => <ProjectPickerButton {...args} />,
};

export const ProjectPickerButtonDisabledStory: StoryObj<ProjectPickerButtonProps> = {
  name: 'ProjectPickerButtonDisabled',
  args: {
    size: 's',
    filteredProjectsCount: 1000,
    totalProjectsCount: 10000,
    isDisabled: true,
  },
  render: (args) => <ProjectPickerButton {...args} />,
};

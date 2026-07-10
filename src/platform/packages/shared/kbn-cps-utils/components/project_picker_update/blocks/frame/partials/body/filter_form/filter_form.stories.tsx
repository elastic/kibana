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
import type { Meta, StoryObj } from '@storybook/react';
import { ProjectPickerFilterForm } from './filter_form';

export default {
  title: 'Project Picker/Blocks/Filter Box',
  component: ProjectPickerFilterForm,
} satisfies Meta<typeof ProjectPickerFilterForm>;

export const ProjectPickerFilterBoxStory: StoryObj<ComponentProps<typeof ProjectPickerFilterForm>> =
  {
    name: 'ProjectPickerFilterBox',
    render: () => <ProjectPickerFilterForm defaultFilterExpression={null} />,
  };

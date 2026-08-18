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

const createProjects = (projectCount: number = 100) => {
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

export const ProjectPickerStory: StoryObj<ComponentProps<typeof ProjectPicker>> = {
  name: 'ProjectPicker',
  args: {
    availableProjects: createProjects(),
  },
  render: (props) => <ProjectPicker {...props} />,
};

export const ProjectPickerReadOnlyStory: StoryObj<ComponentProps<typeof ProjectPicker>> = {
  name: 'ProjectPickerReadOnly',
  argTypes: {
    isReadOnly: {
      control: {
        type: 'boolean',
      },
    },
  },
  args: {
    isReadOnly: true,
    availableProjects: createProjects(100),
  },
  render: (props) => <ProjectPicker {...props} />,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useRef, useState, type ComponentProps } from 'react';
import type { StoryObj, Meta } from '@storybook/react';
import { faker } from '@faker-js/faker';
import { action } from '@storybook/addon-actions';
import type { ProjectRouting } from '@kbn/es-query';
import type { CPSProject } from '../../types';
import { ProjectPickerFlyout } from './project_picker_flyout';

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
 * Emulates a well-behaved consumer: space defaults stay frozen at the initial
 * routing, and only Apply round-trips into `projectRouting`. Discard remounts
 * from last Apply; Revert to space defaults still targets the original value.
 */
const RoutingRoundTripProjectPickerFlyout = ({
  availableProjects,
  projectRouting,
  onApplyChanges,
  ...props
}: Omit<
  ComponentProps<typeof ProjectPickerFlyout>,
  'defaultProjectRoutingGetter' | 'fetchProjectsByRouting'
>) => {
  const initialProjectRouting = useRef(projectRouting);
  const [appliedProjectRouting, setAppliedProjectRouting] =
    useState<ProjectRouting>(projectRouting);

  const defaultProjectRoutingGetter = useCallback(() => initialProjectRouting.current, []);

  const handleApplyChanges = useCallback(
    (routing: NonNullable<ProjectRouting>) => {
      setAppliedProjectRouting(routing);
      onApplyChanges(routing);
    },
    [onApplyChanges]
  );

  const fetchProjectsByRouting = useCallback(
    async (routing?: ProjectRouting) => {
      action('fetchProjectsByRouting')(routing);
      return {
        origin: availableProjects[0] ?? null,
        linkedProjects: availableProjects.slice(1),
      };
    },
    [availableProjects]
  );

  return (
    <ProjectPickerFlyout
      {...props}
      availableProjects={availableProjects}
      projectRouting={appliedProjectRouting}
      defaultProjectRoutingGetter={defaultProjectRoutingGetter}
      fetchProjectsByRouting={fetchProjectsByRouting}
      onApplyChanges={handleApplyChanges}
    />
  );
};

export default {
  component: ProjectPickerFlyout,
  title: 'Project Picker/Flyout',
} satisfies Meta<typeof ProjectPickerFlyout>;

const projectPickerFlyoutStoryProjects = createProjects();

export const ProjectPickerFlyoutStory: StoryObj<ComponentProps<typeof ProjectPickerFlyout>> = {
  name: 'ProjectPickerFlyout',
  args: {
    availableProjects: projectPickerFlyoutStoryProjects,
    projectRouting: '_alias:origin',
    onApplyChanges(projectRouting) {
      action('onApplyChanges')(projectRouting);
    },
    onClose() {
      action('onClose')();
    },
    originProjectId: projectPickerFlyoutStoryProjects[0]._id,
  },
  render: (props) => <RoutingRoundTripProjectPickerFlyout {...props} />,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import userEvent from '@testing-library/user-event';
import { ProjectPickerList } from './list';
import { ProjectPickerProvider, type ProjectPickerProviderProps } from '../../state';

const defaultProps: Pick<ProjectPickerProviderProps, 'availableProjects'> = {
  availableProjects: Array.from({ length: 10 }, () => ({
    _id: faker.string.uuid(),
    _type: faker.helpers.arrayElement(['security', 'observability', 'elasticsearch']),
    _alias: faker.company.name(),
    _organisation: faker.company.name(),
    _region: faker.helpers.arrayElement(['us-east-1', 'us-west-1', 'eu-west-1']),
    _provider: faker.helpers.arrayElement(['AWS', 'Azure', 'GCP']),
  })),
};

const renderComponent = (
  props: Partial<Pick<ProjectPickerProviderProps, 'availableProjects'>> = {}
) => {
  return render(
    <ProjectPickerProvider {...Object.assign(defaultProps, props)}>
      <ProjectPickerList />
    </ProjectPickerProvider>
  );
};

describe('ProjectPickerList', () => {
  it('should render', () => {
    renderComponent();
    expect(screen.getByTestId('projectPickerList')).toBeInTheDocument();
  });

  it('should render the entire project list', () => {
    renderComponent();
    expect(screen.getAllByTestId('projectPickerListItem')).toHaveLength(
      defaultProps.availableProjects.length
    );
  });

  it('should prevent toggling the last included project', async () => {
    const user = userEvent.setup();
    renderComponent();

    const allProjects = screen.getAllByTestId('projectPickerListItem');

    // Toggle all projects except the last one
    for (const project of allProjects.slice(0, -1)) {
      const projectSwitchElement = await within(project).findByRole('switch');

      expect(projectSwitchElement).toHaveAttribute('aria-checked', 'true');
      await user.click(projectSwitchElement);

      expect(projectSwitchElement).toHaveAttribute('aria-checked', 'false');
    }

    const lastIncludedProject = allProjects[allProjects.length - 1];
    const lastIncludedProjectSwitchElement = await within(lastIncludedProject).findByRole('switch');
    expect(lastIncludedProjectSwitchElement).toHaveAttribute('aria-checked', 'true');

    try {
      await user.click(lastIncludedProjectSwitchElement);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toContain('Unable to perform pointer interaction');
    } finally {
      expect(lastIncludedProjectSwitchElement).toHaveAttribute('aria-checked', 'true');
    }
  });
});

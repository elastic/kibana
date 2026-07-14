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
import type { CPSProject } from '../../../../types';
import { ProjectPickerList, getProjectPickerListContextMenuConfig } from './list';
import { ProjectPickerProvider, type ProjectPickerProviderProps } from '../../state';
import type { useProjectPickerActions } from '../../state';
import type { ProjectPickerState } from '../../state/reducers';

const createProject = (id: string): CPSProject => ({
  _id: id,
  _alias: id,
  _type: 'security',
  _organisation: 'org',
  _region: 'us-east-1',
  _provider: 'AWS',
});

const createMenuState = (overrides: Partial<ProjectPickerState> = {}): ProjectPickerState => ({
  filterExpressions: new Map(),
  filteringDimensions: [],
  availableProjects: new Map(),
  excludedOverrides: [],
  filteredProjectIds: ['p1', 'p2'],
  visibleProjectIds: ['p1', 'p2'],
  selectedProjects: ['p1', 'p2'],
  ...overrides,
});

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

describe('getProjectPickerListContextMenuConfig', () => {
  const actions = {
    includeAllOtherVisibleProjects: jest.fn(),
    excludeAllOtherVisibleProjects: jest.fn(),
  } as unknown as ReturnType<typeof useProjectPickerActions>;

  const [includeItem, excludeItem] = getProjectPickerListContextMenuConfig(actions);
  const anchor = createProject('p1');

  const getIncludeDisabled = (state: ProjectPickerState) =>
    includeItem.isDisabled?.({ activeProject: anchor, state }) ?? false;

  const getExcludeDisabled = (state: ProjectPickerState) =>
    excludeItem.isDisabled?.({ activeProject: anchor, state }) ?? false;

  describe('Include all other visible projects', () => {
    it('is disabled when nothing is excluded', () => {
      expect(getIncludeDisabled(createMenuState())).toBe(true);
    });

    it('is disabled when only the anchor is excluded', () => {
      expect(
        getIncludeDisabled(
          createMenuState({
            excludedOverrides: ['p1'],
            selectedProjects: ['p2'],
          })
        )
      ).toBe(true);
    });

    it('is enabled when other projects are excluded', () => {
      expect(
        getIncludeDisabled(
          createMenuState({
            excludedOverrides: ['p2'],
            selectedProjects: ['p1'],
          })
        )
      ).toBe(false);
    });

    it('is enabled when multiple projects including the anchor are excluded', () => {
      expect(
        getIncludeDisabled(
          createMenuState({
            excludedOverrides: ['p1', 'p2'],
            selectedProjects: [],
          })
        )
      ).toBe(false);
    });
  });

  describe('Exclude all other visible projects', () => {
    it('is disabled when only one project is selected', () => {
      expect(
        getExcludeDisabled(
          createMenuState({
            excludedOverrides: ['p2'],
            selectedProjects: ['p1'],
          })
        )
      ).toBe(true);
    });

    it('is disabled when only the anchor is excluded', () => {
      expect(
        getExcludeDisabled(
          createMenuState({
            excludedOverrides: ['p1'],
            selectedProjects: ['p2'],
          })
        )
      ).toBe(true);
    });

    it('is enabled when multiple projects are selected', () => {
      expect(getExcludeDisabled(createMenuState({ selectedProjects: ['p1', 'p2'] }))).toBe(false);
    });

    it('is enabled when multiple projects are excluded but the anchor is included', () => {
      expect(
        getExcludeDisabled(
          createMenuState({
            excludedOverrides: ['p2'],
            selectedProjects: ['p1', 'p2'],
          })
        )
      ).toBe(false);
    });
  });
});

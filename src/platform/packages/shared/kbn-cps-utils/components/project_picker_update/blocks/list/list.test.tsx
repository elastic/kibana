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
import { ProjectPickerStateProvider, type ProjectPickerStateProviderProps } from '../../state';
import type { useProjectPickerActions } from '../../state';
import type { ProjectPickerState } from '../../state/reducers';

const createProject = (id: string, tags: Record<string, string> = {}): CPSProject => ({
  _id: id,
  _alias: id,
  _type: 'security',
  _organisation: 'org',
  _region: 'us-east-1',
  _provider: 'AWS',
  ...tags,
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

const defaultProps: Pick<ProjectPickerStateProviderProps, 'availableProjects'> = {
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
  props: Partial<Pick<ProjectPickerStateProviderProps, 'availableProjects'>> = {}
) => {
  return render(
    <ProjectPickerStateProvider {...defaultProps} {...props}>
      <ProjectPickerList />
    </ProjectPickerStateProvider>
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

  describe('project popovers', () => {
    const taggedProjects = [
      createProject('project-a', { env: 'prod-a' }),
      createProject('project-b', { env: 'prod-b' }),
    ];

    const renderTaggedList = () => renderComponent({ availableProjects: taggedProjects });

    it('replaces an open context menu with tags from a different project', async () => {
      const user = userEvent.setup();
      renderTaggedList();

      await user.click(screen.getByTestId('projectPickerListItemContextMenu-project-a'));
      expect(screen.getByLabelText('Project context menu')).toBeInTheDocument();

      const projectB = screen.getAllByTestId('projectPickerListItem')[1];
      await user.click(within(projectB).getByTestId('projectPickerListItemTags'));

      expect(screen.queryByLabelText('Project context menu')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Project tags')).toBeInTheDocument();
      expect(screen.getByText('env:prod-b')).toBeInTheDocument();
      expect(screen.queryByText('env:prod-a')).not.toBeInTheDocument();
    });

    it('replaces open tags with the context menu from a different project', async () => {
      const user = userEvent.setup();
      renderTaggedList();

      const projectA = screen.getAllByTestId('projectPickerListItem')[0];
      await user.click(within(projectA).getByTestId('projectPickerListItemTags'));
      expect(screen.getByLabelText('Project tags')).toBeInTheDocument();
      expect(screen.getByText('env:prod-a')).toBeInTheDocument();

      await user.click(screen.getByTestId('projectPickerListItemContextMenu-project-b'));

      expect(screen.queryByLabelText('Project tags')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Project context menu')).toBeInTheDocument();
      expect(screen.queryByText('env:prod-a')).not.toBeInTheDocument();
    });

    it('keeps a single context menu when switching between projects', async () => {
      const user = userEvent.setup();
      renderTaggedList();

      await user.click(screen.getByTestId('projectPickerListItemContextMenu-project-a'));
      expect(screen.getByLabelText('Project context menu')).toBeInTheDocument();

      await user.click(screen.getByTestId('projectPickerListItemContextMenu-project-b'));

      expect(screen.getAllByLabelText('Project context menu')).toHaveLength(1);
      expect(screen.queryByLabelText('Project tags')).not.toBeInTheDocument();

      await user.click(screen.getByText('Exclude all other visible projects'));

      expect(screen.getByTestId('projectPickerListItemSwitch-project-a')).toHaveAttribute(
        'aria-checked',
        'false'
      );
      expect(screen.getByTestId('projectPickerListItemSwitch-project-b')).toHaveAttribute(
        'aria-checked',
        'true'
      );
    });

    it('closes the popover when the same control is clicked twice', async () => {
      const user = userEvent.setup();
      renderTaggedList();

      const contextMenuButton = screen.getByTestId('projectPickerListItemContextMenu-project-a');
      await user.click(contextMenuButton);
      expect(screen.getByLabelText('Project context menu')).toBeInTheDocument();

      await user.click(contextMenuButton);
      expect(screen.queryByLabelText('Project context menu')).not.toBeInTheDocument();

      const projectA = screen.getAllByTestId('projectPickerListItem')[0];
      const tagsBadge = within(projectA).getByTestId('projectPickerListItemTags');
      await user.click(tagsBadge);
      expect(screen.getByLabelText('Project tags')).toBeInTheDocument();

      await user.click(tagsBadge);
      expect(screen.queryByLabelText('Project tags')).not.toBeInTheDocument();
    });
  });
});

describe('getProjectPickerListContextMenuConfig', () => {
  const actions = {
    includeAllOtherVisibleProjects: jest.fn(),
    excludeAllOtherVisibleProjects: jest.fn(),
  } as unknown as ReturnType<typeof useProjectPickerActions>;

  const [includeItem, excludeItem] = getProjectPickerListContextMenuConfig(actions);
  const anchor = createProject('p1');

  const getIncludeDisabled = (state: ProjectPickerState, activeProject: CPSProject = anchor) =>
    includeItem.isDisabled({ activeProject, state });

  const getExcludeDisabled = (state: ProjectPickerState, activeProject: CPSProject = anchor) =>
    excludeItem.isDisabled({ activeProject, state });

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

    it('is disabled when the anchor is excluded and there other projects excluded', () => {
      expect(
        getExcludeDisabled(
          createMenuState({
            excludedOverrides: ['p1', 'p3'],
            selectedProjects: ['p2'],
          }),
          createProject('p3')
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

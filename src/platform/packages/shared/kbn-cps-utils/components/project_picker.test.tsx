/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import type { ProjectRouting } from '@kbn/es-query';
import { I18nProvider } from '@kbn/i18n-react';
import { ProjectPicker, type ProjectPickerProps } from './project_picker';
import { ProjectPickerContent } from './project_picker_content';
import type { CPSProject, ProjectsData } from '../types';
import { PROJECT_ROUTING } from '@kbn/cps-common';

const TOUR_STORAGE_KEY = 'cps:projectPicker:tourShown';

const originProject: CPSProject = {
  _id: 'origin',
  _alias: 'Origin CPSProject',
  _type: 'observability',
  _organisation: 'test-org',
};

const linkedProjects: CPSProject[] = [
  {
    _id: 'linked1',
    _alias: 'Linked CPSProject 1',
    _type: 'security',
    _organisation: 'test-org',
  },
  {
    _id: 'linked2',
    _alias: 'Linked CPSProject 2',
    _type: 'elasticsearch',
    _organisation: 'test-org',
  },
];

const mockProjectsData: ProjectsData = {
  origin: originProject,
  linkedProjects,
};

describe('ProjectPicker', () => {
  const defaultProps: ProjectPickerProps = {
    defaultProjectRoutingGetter: () => undefined,
    currentProjectRoutingGetter: () => '',
    onProjectRoutingChange: jest.fn(),
    fetchProjectsByRouting: jest.fn().mockResolvedValue(mockProjectsData),
    totalProjectCount: 3,
  };

  const renderProjectPicker = async (props: Partial<ProjectPickerProps> = {}) => {
    let result;
    await act(async () => {
      result = render(
        <I18nProvider>
          <EuiThemeProvider>
            <ProjectPicker {...defaultProps} {...props} />
          </EuiThemeProvider>
        </I18nProvider>
      );
    });
    return result!;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  });

  it('should show a skeleton while projects are loading', async () => {
    await renderProjectPicker({
      fetchProjectsByRouting: jest.fn(() => new Promise(() => {})),
    });

    expect(screen.queryByTestId('cps-project-picker-button')).not.toBeInTheDocument();
    expect(document.querySelector('.euiSkeletonRectangle')).toBeInTheDocument();
  });

  it('should render nothing when there is no origin project', async () => {
    await renderProjectPicker({
      fetchProjectsByRouting: jest.fn().mockResolvedValue({
        origin: null,
        linkedProjects,
      }),
    });

    expect(screen.queryByTestId('cps-project-picker-button')).not.toBeInTheDocument();
  });

  it('should render nothing when there are no linked projects', async () => {
    await renderProjectPicker({
      totalProjectCount: 1,
      fetchProjectsByRouting: jest.fn().mockResolvedValue({
        origin: originProject,
        linkedProjects: [],
      }),
    });

    expect(screen.queryByTestId('cps-project-picker-button')).not.toBeInTheDocument();
  });

  it('should render the project picker button when projects are available', async () => {
    await renderProjectPicker();

    expect(screen.getByTestId('cps-project-picker-button')).toBeInTheDocument();
    expect(screen.getByTestId('cps-project-picker-button-label')).toHaveTextContent('All');
  });

  it('should open the popover with the project list', async () => {
    await renderProjectPicker();

    await userEvent.click(screen.getByTestId('cps-project-picker-button'));

    expect(screen.getByLabelText('Cross-project search (CPS) scope')).toBeInTheDocument();
    expect(screen.getByText('Change project scope')).toBeInTheDocument();
    expect(screen.getByTestId('projectPickerList')).toBeInTheDocument();
    expect(screen.getAllByTestId('projectPickerListItem')).toHaveLength(3);
    expect(screen.getByText('Origin CPSProject')).toBeInTheDocument();
    expect(screen.getByText('Linked CPSProject 1')).toBeInTheDocument();
    expect(screen.getByText('Linked CPSProject 2')).toBeInTheDocument();
  });

  it('does not call onProjectRoutingChange on mount when routing is already in sync', async () => {
    const onProjectRoutingChange = jest.fn();
    await renderProjectPicker({
      onProjectRoutingChange,
      currentProjectRoutingGetter: () => '_id:*',
      defaultProjectRoutingGetter: () => '_id:*',
    });

    expect(onProjectRoutingChange).not.toHaveBeenCalled();
  });

  it('should persist selection after closing the popover', async () => {
    let currentRouting: ProjectRouting = '';
    const onProjectRoutingChange = jest.fn((routing: ProjectRouting) => {
      currentRouting = routing;
    });

    await renderProjectPicker({
      onProjectRoutingChange,
      currentProjectRoutingGetter: () => currentRouting,
    });

    await userEvent.click(screen.getByTestId('cps-project-picker-button'));
    await userEvent.click(screen.getByTestId('projectPickerListItemSwitch-linked1'));

    expect(screen.getByTestId('cps-project-picker-button-label')).toHaveTextContent('2/3');
    const callsAfterSelection = onProjectRoutingChange.mock.calls.length;

    await userEvent.keyboard('{Escape}');

    expect(screen.getByTestId('cps-project-picker-button-label')).toHaveTextContent('2/3');
    expect(onProjectRoutingChange.mock.calls.length).toBe(callsAfterSelection);
  });

  it('should update project routing when a project is excluded', async () => {
    let currentRouting: ProjectRouting = '';
    const onProjectRoutingChange = jest.fn((routing: ProjectRouting) => {
      currentRouting = routing;
    });

    await renderProjectPicker({
      onProjectRoutingChange,
      currentProjectRoutingGetter: () => currentRouting,
    });

    await userEvent.click(screen.getByTestId('cps-project-picker-button'));

    const linkedProjectSwitch = screen.getByTestId('projectPickerListItemSwitch-linked1');
    await userEvent.click(linkedProjectSwitch);

    expect(onProjectRoutingChange).toHaveBeenLastCalledWith('_id:* AND NOT _id:linked1');
    expect(screen.getByTestId('cps-project-picker-button-label')).toHaveTextContent('2/3');
  });

  it('should render a disabled button when isDisabled is true', async () => {
    const fetchProjectsByRouting = jest.fn().mockResolvedValue(mockProjectsData);
    await renderProjectPicker({ isDisabled: true, fetchProjectsByRouting });

    const button = screen.getByTestId('cps-project-picker-button-disabled');
    expect(button).toBeDisabled();
    expect(screen.queryByTestId('cps-project-picker-button-label')).not.toBeInTheDocument();
    expect(fetchProjectsByRouting).not.toHaveBeenCalled();
  });

  it('should support keyboard navigation to open the popover', async () => {
    await renderProjectPicker();

    await userEvent.tab();
    expect(screen.getByTestId('cps-project-picker-button')).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(screen.getByLabelText('Cross-project search (CPS) scope')).toBeInTheDocument();
    expect(screen.getByTestId('projectPickerList')).toBeInTheDocument();
  });

  it('should prevent excluding the last included project', async () => {
    const user = userEvent.setup();
    await renderProjectPicker();

    await user.click(screen.getByTestId('cps-project-picker-button'));

    await user.click(screen.getByTestId('projectPickerListItemSwitch-linked1'));
    await user.click(screen.getByTestId('projectPickerListItemSwitch-linked2'));

    const originSwitch = screen.getByTestId('projectPickerListItemSwitch-origin');
    expect(originSwitch).toHaveAttribute('aria-checked', 'true');

    try {
      await user.click(originSwitch);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Unable to perform pointer interaction');
    } finally {
      expect(originSwitch).toHaveAttribute('aria-checked', 'true');
    }
  });
});

describe('ProjectPickerContent', () => {
  const mockFetchProjectsByRouting = jest.fn().mockResolvedValue(mockProjectsData);
  const mockProjectRouting: ProjectRouting = '_id:*';

  it('can hide project routing controls and show only the project list', async () => {
    await act(async () => {
      render(
        <I18nProvider>
          <EuiThemeProvider>
            <ProjectPickerContent
              projectRouting={mockProjectRouting}
              fetchProjectsByRouting={mockFetchProjectsByRouting}
              controlsState="hidden"
            />
          </EuiThemeProvider>
        </I18nProvider>
      );
    });

    expect(screen.getByText('Origin CPSProject')).toBeInTheDocument();
    expect(screen.getByText('Linked CPSProject 1')).toBeInTheDocument();
  });

  it('can render a linked-only project list', async () => {
    mockFetchProjectsByRouting.mockImplementation((projectRouting) => {
      return new Promise((resolve) => {
        if (projectRouting === PROJECT_ROUTING.ALL) {
          resolve(mockProjectsData);
        }

        resolve({
          origin: null,
          linkedProjects,
        });
      });
    });

    await act(async () => {
      render(
        <I18nProvider>
          <EuiThemeProvider>
            <ProjectPickerContent
              projectRouting={mockProjectRouting}
              fetchProjectsByRouting={mockFetchProjectsByRouting}
              controlsState="hidden"
            />
          </EuiThemeProvider>
        </I18nProvider>
      );
    });

    expect(screen.getByText('Linked CPSProject 1')).toBeInTheDocument();
  });

  it('shows loading state without projects', async () => {
    mockFetchProjectsByRouting.mockImplementation((projectRouting) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(mockProjectsData);
        }, 1000);
      });
    });

    await act(async () => {
      render(
        <I18nProvider>
          <EuiThemeProvider>
            <ProjectPickerContent
              projectRouting={mockProjectRouting}
              fetchProjectsByRouting={mockFetchProjectsByRouting}
              controlsState="hidden"
            />
          </EuiThemeProvider>
        </I18nProvider>
      );
    });

    expect(document.querySelector('.euiLoadingSpinner')).toBeTruthy();
  });
});

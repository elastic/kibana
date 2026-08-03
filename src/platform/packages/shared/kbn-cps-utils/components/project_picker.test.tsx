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
import { of, Subject } from 'rxjs';
import { ProjectPicker, type ProjectPickerProps } from './project_picker';
import { ProjectPickerContent } from './project_picker_content';
import type { CPSProject, ProjectsData } from '../types';

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
    getActiveRouteProjects$: () => of(mockProjectsData),
    defaultProjectRoutingGetter: () => undefined,
    currentProjectRoutingGetter: () => '',
    onProjectRoutingChange: jest.fn(),
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
    const projects$ = new Subject<ProjectsData | null>();
    await renderProjectPicker({
      getActiveRouteProjects$: () => projects$.asObservable(),
    });

    expect(screen.queryByTestId('cps-project-picker-button')).not.toBeInTheDocument();
    expect(document.querySelector('.euiSkeletonRectangle')).toBeInTheDocument();
  });

  it('should render nothing when there is no origin project', async () => {
    await renderProjectPicker({
      getActiveRouteProjects$: () =>
        of({
          origin: null,
          linkedProjects,
        }),
    });

    expect(screen.queryByTestId('cps-project-picker-button')).not.toBeInTheDocument();
  });

  it('should render nothing when there are no linked projects', async () => {
    await renderProjectPicker({
      getActiveRouteProjects$: () =>
        of({
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
    expect(screen.getByText('Cross-project search')).toBeInTheDocument();
    expect(screen.getByTestId('projectPickerList')).toBeInTheDocument();
    expect(screen.getAllByTestId('projectPickerListItem')).toHaveLength(3);
    expect(screen.getByText('Origin CPSProject')).toBeInTheDocument();
    expect(screen.getByText('Linked CPSProject 1')).toBeInTheDocument();
    expect(screen.getByText('Linked CPSProject 2')).toBeInTheDocument();
  });

  it('does not call onProjectRoutingChange on mount when routing is already in sync', async () => {
    const onProjectRoutingChange = jest.fn();
    await renderProjectPicker({ onProjectRoutingChange });

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
    await renderProjectPicker({ isDisabled: true });

    const button = screen.getByTestId('cps-project-picker-button-disabled');
    expect(button).toBeDisabled();
    expect(screen.queryByTestId('cps-project-picker-button-label')).not.toBeInTheDocument();
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
  const mockProjects = {
    originProject: {
      _id: 'origin',
      _alias: 'Origin CPSProject',
      _type: 'observability',
      _organisation: 'test-org',
    },
    linkedProjects: [
      {
        _id: 'linked1',
        _alias: 'Linked CPSProject 1',
        _type: 'security',
        _organisation: 'test-org',
      },
    ],
    isLoading: false,
    error: null,
  };

  it('can hide project routing controls and show only the project list', async () => {
    await act(async () => {
      render(
        <I18nProvider>
          <EuiThemeProvider>
            <ProjectPickerContent projects={mockProjects} controlsState="hidden" />
          </EuiThemeProvider>
        </I18nProvider>
      );
    });

    expect(screen.queryByText('All projects')).not.toBeInTheDocument();
    expect(screen.queryByText('This project')).not.toBeInTheDocument();
    expect(screen.getByText('Origin CPSProject')).toBeInTheDocument();
    expect(screen.getByText('Linked CPSProject 1')).toBeInTheDocument();
  });

  it('can render a linked-only project list', async () => {
    await act(async () => {
      render(
        <I18nProvider>
          <EuiThemeProvider>
            <ProjectPickerContent
              projects={{
                ...mockProjects,
                originProject: null,
              }}
              controlsState="hidden"
            />
          </EuiThemeProvider>
        </I18nProvider>
      );
    });

    expect(screen.getByText('Linked CPSProject 1')).toBeInTheDocument();
  });

  it('shows loading state without projects', async () => {
    await act(async () => {
      render(
        <I18nProvider>
          <EuiThemeProvider>
            <ProjectPickerContent
              projects={{
                originProject: null,
                linkedProjects: [],
                isLoading: true,
                error: null,
              }}
              controlsState="hidden"
            />
          </EuiThemeProvider>
        </I18nProvider>
      );
    });

    expect(screen.getByText('Searching across 0 projects')).toBeInTheDocument();
  });

  it('shows error state without projects', async () => {
    await act(async () => {
      render(
        <I18nProvider>
          <EuiThemeProvider>
            <ProjectPickerContent
              projects={{
                originProject: null,
                linkedProjects: [],
                isLoading: false,
                error: new Error('Failed to load projects'),
              }}
              controlsState="hidden"
            />
          </EuiThemeProvider>
        </I18nProvider>
      );
    });

    expect(
      screen.getByText('Failed to load projects. Try refreshing the page.')
    ).toBeInTheDocument();
  });
});

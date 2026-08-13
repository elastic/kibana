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
import type { ProjectRouting } from '@kbn/es-query';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { PROJECT_ROUTING } from '@kbn/cps-common';
import { ProjectPicker } from './project_picker';
import { ProjectPickerContent } from './project_picker_content';

describe('ProjectPicker', () => {
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
      {
        _id: 'linked2',
        _alias: 'Linked CPSProject 2',
        _type: 'elasticsearch',
        _organisation: 'test-org',
      },
    ],
    isLoading: false,
    error: null,
  };

  const defaultProps = {
    projectRouting: undefined as ProjectRouting | undefined,
    onProjectRoutingChange: jest.fn(),
    projects: mockProjects,
    totalProjectCount: 2,
  };

  const renderProjectPicker = async (props: Partial<typeof defaultProps> = {}) => {
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

  const getButton = () => screen.getByLabelText('Cross-project search project picker');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the project picker button', async () => {
    await renderProjectPicker();

    expect(getButton()).toBeInTheDocument();
  });
  it('should display button group options in popover', async () => {
    await renderProjectPicker();

    expect(getButton()).toBeInTheDocument();

    await userEvent.click(getButton());
    expect(screen.getByText('All projects')).toBeInTheDocument();
    expect(screen.getByText('This project')).toBeInTheDocument();
  });

  describe('projectRouting selection', () => {
    it('should show "All projects" selected when projectRouting is undefined', async () => {
      await renderProjectPicker({ projectRouting: undefined });

      await userEvent.click(getButton());

      const allProjectsButton = screen.getByRole('button', { name: /All projects/i });
      expect(allProjectsButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show "This project" selected when projectRouting is ORIGIN', async () => {
      await renderProjectPicker({ projectRouting: PROJECT_ROUTING.ORIGIN });

      await userEvent.click(getButton());

      const thisProjectButton = screen.getByRole('button', { name: /This project/i });
      expect(thisProjectButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('projectRouting change events', () => {
    it('should call onProjectRoutingChange with PROJECT_ROUTING.ALL when "All projects" is clicked', async () => {
      const onProjectRoutingChange = jest.fn();
      await renderProjectPicker({
        projectRouting: PROJECT_ROUTING.ORIGIN,
        onProjectRoutingChange,
      });

      await userEvent.click(getButton());
      expect(screen.getByText('All projects')).toBeInTheDocument();
      const allProjectsButton = screen.getByRole('button', { name: /All projects/i });
      await userEvent.click(allProjectsButton);

      expect(onProjectRoutingChange).toHaveBeenCalledWith(PROJECT_ROUTING.ALL);
      expect(onProjectRoutingChange).toHaveBeenCalledTimes(1);
    });

    it('should call onProjectRoutingChange with ORIGIN when "This project" is clicked', async () => {
      const onProjectRoutingChange = jest.fn();
      await renderProjectPicker({
        projectRouting: undefined,
        onProjectRoutingChange,
      });

      await userEvent.click(getButton());
      expect(screen.getByText('This project')).toBeInTheDocument();

      const thisProjectButton = screen.getByRole('button', { name: /This project/i });
      await userEvent.click(thisProjectButton);

      expect(onProjectRoutingChange).toHaveBeenCalledWith(PROJECT_ROUTING.ORIGIN);
      expect(onProjectRoutingChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('state transitions', () => {
    it('should reflect prop changes correctly', async () => {
      const onProjectRoutingChange = jest.fn();
      const { rerender } = await renderProjectPicker({
        projectRouting: undefined,
        onProjectRoutingChange,
      });

      // Open popover and verify "All projects" is selected
      await userEvent.click(getButton());

      const allProjectsButton = screen.getByRole('button', { name: /All projects/i });
      expect(allProjectsButton).toHaveAttribute('aria-pressed', 'true');

      // Click "This project"
      const thisProjectButton = screen.getByRole('button', { name: /This project/i });
      await userEvent.click(thisProjectButton);

      expect(onProjectRoutingChange).toHaveBeenCalledWith(PROJECT_ROUTING.ORIGIN);
      expect(onProjectRoutingChange).toHaveBeenCalledTimes(1);

      // Simulate parent component updating the prop (after callback is processed)
      rerender(
        <I18nProvider>
          <EuiThemeProvider>
            <ProjectPicker
              {...defaultProps}
              projectRouting={PROJECT_ROUTING.ORIGIN}
              onProjectRoutingChange={onProjectRoutingChange}
            />
          </EuiThemeProvider>
        </I18nProvider>
      );

      // Close and reopen popover to see updated state
      await userEvent.keyboard('{Escape}');

      await userEvent.click(getButton());

      const thisProjectButtonUpdated = screen.getByRole('button', { name: /This project/i });
      expect(thisProjectButtonUpdated).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', async () => {
      await renderProjectPicker();

      expect(getButton()).toBeInTheDocument();
      const button = screen.getByLabelText('Cross-project search project picker');
      expect(button).toHaveAttribute('aria-label', 'Cross-project search project picker');

      await userEvent.click(button);

      const buttonGroup = screen.getByRole('group', {
        name: 'Cross-project search project picker',
      });
      expect(buttonGroup).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const onProjectRoutingChange = jest.fn();
      await renderProjectPicker({
        projectRouting: undefined,
        onProjectRoutingChange,
      });
      // Tab to the button
      await userEvent.tab();

      const button = screen.getByLabelText('Cross-project search project picker');
      expect(button).toHaveFocus();

      // Press Enter to open popover
      await userEvent.keyboard('{Enter}');

      expect(screen.getByText('Cross-project search (CPS) scope')).toBeInTheDocument();
    });
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

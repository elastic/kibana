/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ProjectRouting } from '@kbn/es-query';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ProjectPickerComponent } from './project_picker_component';

describe('ProjectPickerComponent', () => {
  const defaultProps = {
    projectRouting: undefined as ProjectRouting | undefined,
    onProjectRoutingChange: jest.fn(),
    originProject: {
      _id: 'origin',
      _alias: 'Origin Project',
      _type: 'observability',
      _csp: 'aws',
      _region: 'us-east-1',
    },
    linkedProjects: [
      {
        _id: 'linked1',
        _alias: 'Linked Project 1',
        _type: 'security',
        _csp: 'azure',
        _region: 'eastus',
      },
      {
        _id: 'linked2',
        _alias: 'Linked Project 2',
        _type: 'elasticsearch',
        _csp: 'gcp',
        _region: 'us-central1',
      },
    ],
  };

  const renderProjectPicker = (props: Partial<typeof defaultProps> = {}) => {
    return render(
      <I18nProvider>
        <EuiThemeProvider>
          <ProjectPickerComponent {...defaultProps} {...props} />
        </EuiThemeProvider>
      </I18nProvider>
    );
  };

  const getButton = () => screen.getByLabelText('Cross-project search project picker');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the project picker button', () => {
    renderProjectPicker();
    expect(getButton()).toBeInTheDocument();
  });
  it('should display button group options in popover', async () => {
    renderProjectPicker();
    await userEvent.click(getButton());
    expect(screen.getByText('All projects')).toBeInTheDocument();
    expect(screen.getByText('This project')).toBeInTheDocument();
  });

  describe('projectRouting selection', () => {
    it('should show "All projects" selected when projectRouting is undefined', async () => {
      renderProjectPicker({ projectRouting: undefined });
      await userEvent.click(getButton());

      const allProjectsButton = screen.getByRole('button', { name: /All projects/i });
      expect(allProjectsButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show "This project" selected when projectRouting is _alias:_origin', async () => {
      renderProjectPicker({ projectRouting: '_alias:_origin' });

      await userEvent.click(getButton());

      const thisProjectButton = screen.getByRole('button', { name: /This project/i });
      expect(thisProjectButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('projectRouting change events', () => {
    it('should call onProjectRoutingChange with undefined when "All projects" is clicked', async () => {
      const onProjectRoutingChange = jest.fn();
      renderProjectPicker({
        projectRouting: '_alias:_origin',
        onProjectRoutingChange,
      });

      await userEvent.click(getButton());
      expect(screen.getByText('All projects')).toBeInTheDocument();
      const allProjectsButton = screen.getByRole('button', { name: /All projects/i });
      await userEvent.click(allProjectsButton);

      expect(onProjectRoutingChange).toHaveBeenCalledWith(undefined);
      expect(onProjectRoutingChange).toHaveBeenCalledTimes(1);
    });

    it('should call onProjectRoutingChange with _alias:_origin when "This project" is clicked', async () => {
      const onProjectRoutingChange = jest.fn();
      renderProjectPicker({
        projectRouting: undefined,
        onProjectRoutingChange,
      });

      await userEvent.click(getButton());
      expect(screen.getByText('This project')).toBeInTheDocument();

      const thisProjectButton = screen.getByRole('button', { name: /This project/i });
      await userEvent.click(thisProjectButton);

      expect(onProjectRoutingChange).toHaveBeenCalledWith('_alias:_origin');
      expect(onProjectRoutingChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('state transitions', () => {
    it('should reflect prop changes correctly', async () => {
      const onProjectRoutingChange = jest.fn();
      const { rerender } = renderProjectPicker({
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

      expect(onProjectRoutingChange).toHaveBeenCalledWith('_alias:_origin');
      expect(onProjectRoutingChange).toHaveBeenCalledTimes(1);

      // Simulate parent component updating the prop (after callback is processed)
      rerender(
        <I18nProvider>
          <EuiThemeProvider>
            <ProjectPickerComponent
              {...defaultProps}
              projectRouting="_alias:_origin"
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
      renderProjectPicker();

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
      renderProjectPicker({
        projectRouting: undefined,
        onProjectRoutingChange,
      });

      // Tab to the button
      await userEvent.tab();

      const button = screen.getByLabelText('Cross-project search project picker');
      expect(button).toHaveFocus();

      // Press Enter to open popover
      await userEvent.keyboard('{Enter}');

      expect(screen.getByText('Cross-project search scope')).toBeInTheDocument();
    });
  });
});

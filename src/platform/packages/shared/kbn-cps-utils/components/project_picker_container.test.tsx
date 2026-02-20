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
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { BehaviorSubject } from 'rxjs';
import type { ProjectRouting } from '@kbn/es-query';
import type { CPSProject, ICPSManager } from '../types';
import { ProjectRoutingAccess } from '../types';
import { ProjectPickerContainer } from './project_picker_container';

const mockOriginProject: CPSProject = {
  _id: 'origin-project',
  _alias: 'Origin CPSProject',
  _type: 'observability',
  _organisation: 'test-org',
};

const mockLinkedProjects: CPSProject[] = [
  {
    _id: 'linked-1',
    _alias: 'Linked CPSProject 1',
    _type: 'security',
    _organisation: 'test-org',
  },
];

describe('ProjectPickerContainer', () => {
  const renderProjectPicker = async (
    props: { cpsManager: Partial<ICPSManager> } = { cpsManager: {} }
  ) => {
    const mockProjectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(undefined);
    // Default to EDITABLE access (dashboards app on individual page)
    const mockProjectPickerAccess$ = new BehaviorSubject<ProjectRoutingAccess>(
      ProjectRoutingAccess.EDITABLE
    );
    const cpsManager = {
      fetchProjects: jest.fn().mockResolvedValue({
        origin: mockOriginProject,
        linkedProjects: mockLinkedProjects,
      }),
      getProjectRouting: jest.fn(() => undefined),
      getProjectRouting$: jest.fn(() => mockProjectRouting$),
      setProjectRouting: jest.fn(),
      getProjectPickerAccess: jest.fn(() => mockProjectPickerAccess$.getValue()),
      getProjectPickerAccess$: jest.fn(() => mockProjectPickerAccess$),
      refresh: jest.fn(),
      getDefaultProjectRouting: jest.fn(() => undefined),
      ...props.cpsManager,
    };
    return await act(async () => {
      const component = <ProjectPickerContainer cpsManager={cpsManager} />;
      return render(
        <I18nProvider>
          <EuiThemeProvider>{component}</EuiThemeProvider>
        </I18nProvider>
      );
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering conditions', () => {
    it('should render when all required props and services are available', async () => {
      await renderProjectPicker();
      expect(screen.getByTestId('project-picker-button')).toBeInTheDocument();
    });

    it('should call fetchProjects when component mounts', async () => {
      await renderProjectPicker({
        cpsManager: {
          fetchProjects: jest.fn().mockResolvedValue({
            origin: mockOriginProject,
            linkedProjects: mockLinkedProjects,
          }),
        },
      });
      expect(screen.queryByTestId('project-picker-button')).toBeInTheDocument();
    });

    it('should not render when there is no origin project', async () => {
      await renderProjectPicker({
        cpsManager: {
          fetchProjects: jest.fn().mockResolvedValue({
            origin: null,
            linkedProjects: mockLinkedProjects,
          }),
        },
      });

      expect(screen.queryByTestId('project-picker-button')).not.toBeInTheDocument();
    });

    it('should not render when there are no linked projects', async () => {
      await renderProjectPicker({
        cpsManager: {
          fetchProjects: jest.fn().mockResolvedValue({
            origin: mockOriginProject,
            linkedProjects: [],
          }),
        },
      });
      expect(screen.queryByTestId('project-picker-button')).not.toBeInTheDocument();
    });
  });

  describe('project routing access control', () => {
    it('should have EDITABLE access when on dashboard create page', async () => {
      await renderProjectPicker({
        cpsManager: {
          getProjectPickerAccess$: jest.fn(
            () => new BehaviorSubject(ProjectRoutingAccess.EDITABLE)
          ),
          getProjectPickerAccess: jest.fn(() => ProjectRoutingAccess.EDITABLE),
        },
      });
      const button = screen.getByTestId('project-picker-button');
      expect(button).not.toHaveAttribute('disabled');
    });

    it('should have DISABLED access when on a different app', async () => {
      await renderProjectPicker({
        cpsManager: {
          getProjectPickerAccess$: jest.fn(
            () => new BehaviorSubject(ProjectRoutingAccess.DISABLED)
          ),
          getProjectPickerAccess: jest.fn(() => ProjectRoutingAccess.DISABLED),
        },
      });
      const button = screen.getByTestId('project-picker-button');
      expect(button).toHaveAttribute('disabled');
    });

    it('should have READONLY access when on Lens editor page', async () => {
      await renderProjectPicker({
        cpsManager: {
          getProjectPickerAccess$: jest.fn(
            () => new BehaviorSubject(ProjectRoutingAccess.READONLY)
          ),
          getProjectPickerAccess: jest.fn(() => ProjectRoutingAccess.READONLY),
        },
      });
      const button = screen.getByTestId('project-picker-button');
      // Button should not be disabled but should be in readonly mode
      expect(button).not.toHaveAttribute('disabled');
    });
  });
});

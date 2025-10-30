/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { BehaviorSubject } from 'rxjs';
import type { ProjectRouting } from '@kbn/es-query';
import type { CPSPluginStart, Project } from '@kbn/cps/public';
import { ProjectPicker } from './project_picker';

// Mock the useKibana hook
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

// Mock the lazy-loaded component
jest.mock('./project_picker_component', () => ({
  ProjectPickerComponent: jest.fn(({ originProject }) => (
    <div data-testid="project-picker-component">
      Project: {originProject._alias}
    </div>
  )),
}));

const mockUseKibana = require('@kbn/kibana-react-plugin/public').useKibana;

describe('ProjectPicker', () => {
  const mockOriginProject: Project = {
    _id: 'origin-project',
    _alias: 'Origin Project',
    _type: 'observability',
    _csp: 'aws',
    _region: 'us-east-1',
  };

  const mockLinkedProjects: Project[] = [
    {
      _id: 'linked-1',
      _alias: 'Linked Project 1',
      _type: 'security',
      _csp: 'azure',
      _region: 'eastus',
    },
  ];

  const mockProjectsSubject = new BehaviorSubject({
    origin: mockOriginProject,
    linkedProjects: mockLinkedProjects,
  });

  const mockCPSManager = {
    projects$: mockProjectsSubject.asObservable(),
  };

  const mockCPSService: CPSPluginStart = {
    cpsManager: mockCPSManager,
  } as any;

  const renderProjectPicker = (
    props: {
      projectRouting?: ProjectRouting;
      onProjectRoutingChange?: (projectRouting: ProjectRouting) => void;
      wrappingContainer?: (children: React.ReactNode) => React.ReactElement;
    } = {}
  ) => {
    const defaultProps = {
      projectRouting: undefined,
      onProjectRoutingChange: jest.fn(),
      ...props,
    };

    return render(
      <I18nProvider>
        <EuiThemeProvider>
          <ProjectPicker {...defaultProps} />
        </EuiThemeProvider>
      </I18nProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        cps: mockCPSService,
      },
    });
  });

  afterEach(() => {
    mockProjectsSubject.next({
      origin: mockOriginProject,
      linkedProjects: mockLinkedProjects,
    });
  });

  describe('rendering conditions', () => {
    it('should render when all required props and services are available', async () => {
      renderProjectPicker();

      await waitFor(() => {
        expect(screen.getByTestId('project-picker-component')).toBeInTheDocument();
      });
    });

    it('should not render when cpsManager is not available', () => {
      mockUseKibana.mockReturnValue({
        services: {
          cps: {},
        },
      });

      renderProjectPicker();

      expect(screen.queryByTestId('project-picker-component')).not.toBeInTheDocument();
    });

    it('should not render when onProjectRoutingChange is not provided', () => {
      renderProjectPicker({ onProjectRoutingChange: undefined });

      expect(screen.queryByTestId('project-picker-component')).not.toBeInTheDocument();
    });

    it('should not render when there is no origin project', async () => {
      mockProjectsSubject.next({
        origin: null,
        linkedProjects: mockLinkedProjects,
      });

      renderProjectPicker();

      await waitFor(() => {
        expect(screen.queryByTestId('project-picker-component')).not.toBeInTheDocument();
      });
    });

    it('should not render when there are no linked projects', async () => {
      mockProjectsSubject.next({
        origin: mockOriginProject,
        linkedProjects: [],
      });

      renderProjectPicker();

      await waitFor(() => {
        expect(screen.queryByTestId('project-picker-component')).not.toBeInTheDocument();
      });
    });
  });

  describe('wrappingContainer', () => {
    it('should use default wrapper when not provided', async () => {
      renderProjectPicker();

      await waitFor(() => {
        expect(screen.getByTestId('project-picker-component')).toBeInTheDocument();
      });
    });

    it('should use custom wrapper when provided', async () => {
      const customWrapper = (children: React.ReactNode) => (
        <div data-testid="custom-wrapper">{children}</div>
      );

      renderProjectPicker({ wrappingContainer: customWrapper });

      await waitFor(() => {
        expect(screen.getByTestId('custom-wrapper')).toBeInTheDocument();
        expect(screen.getByTestId('project-picker-component')).toBeInTheDocument();
      });
    });
  });

  describe('observable subscription', () => {
    it('should update when projects observable emits new values', async () => {
      renderProjectPicker();

      await waitFor(() => {
        expect(screen.getByText(/Origin Project/)).toBeInTheDocument();
      });

      // Update the observable with new data
      const newOriginProject: Project = {
        _id: 'new-origin',
        _alias: 'New Origin Project',
        _type: 'elasticsearch',
        _csp: 'gcp',
        _region: 'us-central1',
      };

      mockProjectsSubject.next({
        origin: newOriginProject,
        linkedProjects: mockLinkedProjects,
      });

      await waitFor(() => {
        expect(screen.getByText(/New Origin Project/)).toBeInTheDocument();
      });
    });

    it('should unsubscribe on unmount', async () => {
      const { unmount } = renderProjectPicker();

      await waitFor(() => {
        expect(screen.getByTestId('project-picker-component')).toBeInTheDocument();
      });

      const unsubscribeSpy = jest.spyOn(mockProjectsSubject, 'subscribe');
      unmount();

      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });
});

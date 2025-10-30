/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { BehaviorSubject } from 'rxjs';
import type { ProjectRouting } from '@kbn/es-query';
import type { CPSManager, Project } from '@kbn/cps/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ProjectPicker } from './project_picker';

// Mock the useKibana hook
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

// Mock the lazy-loaded component
jest.mock('./project_picker_component', () => ({
  ProjectPickerComponent: jest.fn(({ originProject }) => (
    <div data-test-subj="project-picker-component">Project: {originProject._alias}</div>
  )),
}));

interface TestServices {
  cps?: {
    cpsManager?: CPSManager;
  };
}

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

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

  const mockCPSService = {
    cpsManager: mockCPSManager as CPSManager,
  } ;

  const renderProjectPicker = async (
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

    let result;
    await act(async () => {
      result = render(
        <I18nProvider>
          <EuiThemeProvider>
            <ProjectPicker {...defaultProps} />
          </EuiThemeProvider>
        </I18nProvider>
      );
    });

    return result!;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockUseKibana as jest.Mock).mockReturnValue({
      services: {
        cps: mockCPSService,
      } as TestServices,
    });
  });

  afterEach(() => {
    act(() => {
      mockProjectsSubject.next({
        origin: mockOriginProject,
        linkedProjects: mockLinkedProjects,
      });
    });
  });

  describe('rendering conditions', () => {
    it('should render when all required props and services are available', async () => {
      await renderProjectPicker();

      expect(screen.getByTestId('project-picker-component')).toBeInTheDocument();
    });

    it('should not render when cpsManager is not available', async () => {
      (mockUseKibana as jest.Mock).mockReturnValue({
        services: {
          cps: {},
        } as TestServices,
      });
      await renderProjectPicker();
      expect(screen.queryByTestId('project-picker-component')).not.toBeInTheDocument();
    });

    it('should not render when onProjectRoutingChange is not provided', async () => {
      await renderProjectPicker({ onProjectRoutingChange: undefined });
      expect(screen.queryByTestId('project-picker-component')).not.toBeInTheDocument();
    });

    it('should not render when there is no origin project', async () => {
      act(() => {
        mockProjectsSubject.next({
          origin: null!,
          linkedProjects: mockLinkedProjects,
        });
      });
      await renderProjectPicker();
      expect(screen.queryByTestId('project-picker-component')).not.toBeInTheDocument();
    });

    it('should not render when there are no linked projects', async () => {
      act(() => {
        mockProjectsSubject.next({
          origin: mockOriginProject,
          linkedProjects: [],
        });
      });

      await renderProjectPicker();
      expect(screen.queryByTestId('project-picker-component')).not.toBeInTheDocument();
    });
  });

  describe('wrappingContainer', () => {
    it('should use default wrapper when not provided', async () => {
      await renderProjectPicker();
      expect(screen.getByTestId('project-picker-component')).toBeInTheDocument();
    });

    it('should use custom wrapper when provided', async () => {
      const customWrapper = (children: React.ReactNode) => (
        <div data-test-subj="custom-wrapper">{children}</div>
      );

      await renderProjectPicker({ wrappingContainer: customWrapper });
      expect(screen.getByTestId('custom-wrapper')).toBeInTheDocument();
      expect(screen.getByTestId('project-picker-component')).toBeInTheDocument();
    });
  });

  describe('observable subscription', () => {
    it('should update when projects observable emits new values', async () => {
      await renderProjectPicker();

      expect(screen.getByText(/Origin Project/)).toBeInTheDocument();

      // Update the observable with new data
      const newOriginProject: Project = {
        _id: 'new-origin',
        _alias: 'New Origin Project',
        _type: 'elasticsearch',
        _csp: 'gcp',
        _region: 'us-central1',
      };

      await act(async () => {
        mockProjectsSubject.next({
          origin: newOriginProject,
          linkedProjects: mockLinkedProjects,
        });
      });

      expect(screen.getByText(/New Origin Project/)).toBeInTheDocument();
    });
  });
});

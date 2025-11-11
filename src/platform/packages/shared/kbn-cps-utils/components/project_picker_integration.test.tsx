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
import type { CPSProject, ICPSManager } from '../types';
import { ProjectPicker } from './project_picker';

// Mock the lazy-loaded component
jest.mock('./project_picker_component', () => ({
  ProjectPickerComponent: jest.fn(({ originProject }) => (
    <div data-test-subj="project-picker-component">CPSProject: {originProject._alias}</div>
  )),
}));

describe('ProjectPicker', () => {
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

  let mockProjectRouting$: BehaviorSubject<ProjectRouting | undefined>;
  let mockCPSManager: ICPSManager;

  const mockFetchProjects = jest.fn().mockResolvedValue({
    origin: mockOriginProject,
    linkedProjects: mockLinkedProjects,
  });

  const renderProjectPicker = async (
    props: { cpsManager: ICPSManager } = { cpsManager: mockCPSManager }
  ) => {
    let result;
    await act(async () => {
      const component = <ProjectPicker cpsManager={props.cpsManager} />;
      result = render(
        <I18nProvider>
          <EuiThemeProvider>{component}</EuiThemeProvider>
        </I18nProvider>
      );
    });

    return result!;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchProjects.mockResolvedValue({
      origin: mockOriginProject,
      linkedProjects: mockLinkedProjects,
    });

    mockProjectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(undefined);
    mockCPSManager = {
      fetchProjects: mockFetchProjects,
      getProjectRouting: jest.fn(() => undefined),
      getProjectRouting$: jest.fn(() => mockProjectRouting$),
      setProjectRouting: jest.fn(),
    } as unknown as ICPSManager;
  });

  describe('rendering conditions', () => {
    it('should render when all required props and services are available', async () => {
      await renderProjectPicker();

      expect(screen.getByTestId('project-picker-component')).toBeInTheDocument();
    });

    it('should call fetchProjects when component mounts', async () => {
      await renderProjectPicker();

      expect(mockFetchProjects).toHaveBeenCalledTimes(1);
    });

    it('should not render when there is no origin project', async () => {
      mockFetchProjects.mockResolvedValueOnce({
        origin: null,
        linkedProjects: mockLinkedProjects,
      });
      await renderProjectPicker();
      expect(screen.queryByTestId('project-picker-component')).not.toBeInTheDocument();
    });

    it('should not render when there are no linked projects', async () => {
      mockFetchProjects.mockResolvedValueOnce({
        origin: mockOriginProject,
        linkedProjects: [],
      });

      await renderProjectPicker();
      expect(screen.queryByTestId('project-picker-component')).not.toBeInTheDocument();
    });
  });
});

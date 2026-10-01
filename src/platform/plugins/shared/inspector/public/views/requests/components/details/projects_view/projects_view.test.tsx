/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { cpsPluginMock } from '@kbn/cps/public/mocks';
import type { CPSProject, ICPSManager, ProjectsData } from '@kbn/cps-utils';
import { ProjectsView } from './projects_view';
import type { Request } from '../../../../../../common/adapters/request/types';

const originProject: CPSProject = {
  _id: 'origin-id',
  _alias: 'my-origin-project',
  _type: 'observability',
  _organisation: 'my-org',
  _csp: 'aws',
  _region: 'us-east-1',
};

const linkedProject: CPSProject = {
  _id: 'linked-id',
  _alias: 'my-project-b72b95',
  _type: 'security',
  _organisation: 'my-org',
  _csp: 'azure',
  _region: 'eastus2',
  team: 'search',
};

const projectsData: ProjectsData = {
  origin: originProject,
  linkedProjects: [linkedProject],
};

const request = {
  response: {
    json: {
      rawResponse: {
        _clusters: {
          total: 3,
          successful: 3,
          skipped: 0,
          details: {
            _origin: {
              status: 'successful',
              indices: 'kibana_sample_data_logs',
              took: 3,
              timed_out: false,
              _shards: { total: 2, successful: 2, skipped: 0, failed: 0 },
            },
            'my-project-b72b95': {
              status: 'partial',
              indices: 'kibana_sample_data_logs',
              took: 7,
              timed_out: false,
              _shards: { total: 2, successful: 1, skipped: 0, failed: 1 },
            },
            'unmatched-cluster': {
              status: 'successful',
              indices: 'kibana_sample_data_logs',
              took: 11,
              timed_out: false,
              _shards: { total: 2, successful: 2, skipped: 0, failed: 0 },
            },
          },
        },
      },
    },
  },
} as unknown as Request;

function renderProjectsView(cpsManager: ICPSManager) {
  return render(
    <KibanaContextProvider services={{ cpsManager }}>
      <ProjectsView request={request} />
    </KibanaContextProvider>
  );
}

function createCpsManager(fetchResult: Promise<ProjectsData | null>) {
  const cpsManager = cpsPluginMock.createStartContract().cpsManager as jest.Mocked<ICPSManager>;
  cpsManager.fetchProjects.mockReturnValue(fetchResult);
  return cpsManager;
}

describe('shouldShow', () => {
  test('is true if isCpsMultiProject is true', () => {
    expect(ProjectsView.shouldShow(request, true)).toBe(true);
    expect(
      ProjectsView.shouldShow({ response: { json: { rawResponse: {} } } } as unknown as Request)
    ).toBe(false);
  });
});

describe('render', () => {
  test('should render project identity for matched clusters and raw names for unmatched ones', async () => {
    renderProjectsView(createCpsManager(Promise.resolve(projectsData)));

    expect(await screen.findByText('my-origin-project')).toBeInTheDocument();
    expect(screen.getByText('my-project-b72b95')).toBeInTheDocument();
    expect(screen.getByText('unmatched-cluster')).toBeInTheDocument();
    expect(screen.getByText('AWS')).toBeInTheDocument();
    expect(screen.getByText('Azure')).toBeInTheDocument();
    expect(screen.getByText('us-east-1')).toBeInTheDocument();
    expect(screen.getByText('eastus2')).toBeInTheDocument();
    // tag count badge for the linked project's single custom tag
    expect(screen.getByLabelText('1 tag: team: search')).toBeInTheDocument();
  });

  test('should filter rows by project alias search', async () => {
    renderProjectsView(createCpsManager(Promise.resolve(projectsData)));

    await screen.findByText('my-origin-project');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'unmatched' } });

    expect(screen.getByText('unmatched-cluster')).toBeInTheDocument();
    expect(screen.queryByText('my-origin-project')).toBeNull();
    expect(screen.queryByText('my-project-b72b95')).toBeNull();
  });

  test('should render unenriched cluster rows when projects cannot be fetched', async () => {
    renderProjectsView(createCpsManager(Promise.reject(new Error('boom'))));

    expect(await screen.findByText('_origin')).toBeInTheDocument();
    expect(screen.getByText('my-project-b72b95')).toBeInTheDocument();
    expect(screen.getByText('unmatched-cluster')).toBeInTheDocument();
    expect(screen.queryByText('AWS')).toBeNull();
  });

  test('should render unenriched cluster rows when the projects request is not permitted', async () => {
    renderProjectsView(createCpsManager(Promise.resolve(null)));

    expect(await screen.findByText('_origin')).toBeInTheDocument();
    expect(screen.queryByText('my-origin-project')).toBeNull();
  });
});

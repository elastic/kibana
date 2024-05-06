/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { LogsOverview } from './logs_overview';
import { DataView } from '@kbn/data-views-plugin/common';
import { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { setUnifiedDocViewerServices } from '../../plugin';
import { mockUnifiedDocViewerServices } from '../../__mocks__';

const DATASET_NAME = 'logs.overview';
const NAMESPACE = 'default';
const DATA_STREAM_NAME = `logs-${DATASET_NAME}-${NAMESPACE}`;
const NOW = Date.now();

const dataView = {
  fields: {
    getAll: () =>
      [
        '_index',
        'message',
        'log.level',
        'service.name',
        'host.name',
        'trace.id',
        'orchestrator.cluster.id',
        'orchestrator.cluster.name',
        'orchestrator.resource.id',
        'cloud.provider',
        'cloud.region',
        'cloud.availability_zone',
        'cloud.project.id',
        'cloud.instance.id',
        'agent.name',
      ].map((name) => ({
        name,
        type: 'string',
        scripted: false,
        filterable: true,
      })),
  },
  metaFields: ['_index', '_score'],
  getFormatterForField: jest.fn(() => ({ convert: (value: unknown) => value })),
} as unknown as DataView;

dataView.fields.getByName = (name: string) => {
  return dataView.fields.getAll().find((field) => field.name === name);
};

const fullHit = buildDataTableRecord(
  {
    _index: DATA_STREAM_NAME,
    _id: DATA_STREAM_NAME,
    _score: 1,
    _source: {
      '@timestamp': NOW + 1000,
      message: 'full document',
      log: { level: 'info', file: { path: '/logs.overview.log' } },
      data_stream: {
        type: 'logs',
        dataset: DATASET_NAME,
        namespace: NAMESPACE,
      },
      'service.name': DATASET_NAME,
      'host.name': 'gke-edge-oblt-pool',
      'trace.id': 'abcdef',
      orchestrator: {
        cluster: {
          id: 'my-cluster-id',
          name: 'my-cluster-name',
        },
        resource: {
          id: 'orchestratorResourceId',
        },
      },
      cloud: {
        provider: ['gcp'],
        region: 'us-central-1',
        availability_zone: 'us-central-1a',
        project: {
          id: 'elastic-project',
        },
        instance: {
          id: 'BgfderflkjTheUiGuy',
        },
      },
      'agent.name': 'node',
    },
  },
  dataView
);

setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

const renderLogsOverview = (props: Partial<DocViewRenderProps> = {}) => {
  const { rerender: baseRerender, ...tools } = render(
    <LogsOverview dataView={dataView} hit={fullHit} {...props} />
  );

  const rerender = (rerenderProps: Partial<DocViewRenderProps>) =>
    baseRerender(<LogsOverview dataView={dataView} hit={fullHit} {...props} {...rerenderProps} />);

  return { rerender, ...tools };
};

describe('LogsOverview', () => {
  beforeEach(() => renderLogsOverview());

  describe('Header section', () => {
    it('should display a timestamp badge', async () => {
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewTimestamp')).toBeInTheDocument();
    });

    it('should display a log level badge when available', async () => {
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewLogLevel')).toBeInTheDocument();
    });

    it('should display a message code block when available', async () => {
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewMessage')).toBeInTheDocument();
    });
  });

  describe('Highlights section', () => {
    it('should load the service container with all fields', async () => {
      expect(
        screen.queryByTestId('unifiedDocViewLogsOverviewHighlightSectionServiceInfra')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewService')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewTrace')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewHostName')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewClusterName')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewResourceId')).toBeInTheDocument();
    });

    it('should load the cloud container with all fields', async () => {
      expect(
        screen.queryByTestId('unifiedDocViewLogsOverviewHighlightSectionCloud')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewCloudProvider')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewCloudRegion')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewCloudAz')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewCloudProjectId')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewCloudInstanceId')).toBeInTheDocument();
    });

    it('should load the other container with all fields', async () => {
      expect(
        screen.queryByTestId('unifiedDocViewLogsOverviewHighlightSectionOther')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewLogPathFile')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewNamespace')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewDataset')).toBeInTheDocument();
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewLogShipper')).toBeInTheDocument();
    });
  });
});

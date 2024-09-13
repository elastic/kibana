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
const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

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
        availability_zone: MORE_THAN_1024_CHARS,
        project: {
          id: 'elastic-project',
        },
        instance: {
          id: 'BgfderflkjTheUiGuy',
        },
      },
      'agent.name': 'node',
    },
    ignored_field_values: {
      'cloud.availability_zone': [MORE_THAN_1024_CHARS],
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
      expect(screen.queryByTestId('unifiedDocViewLogsOverviewLogLevel-info')).toBeInTheDocument();
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
  describe('Degraded Fields section', () => {
    it('should load the degraded fields container when present', async () => {
      expect(
        screen.queryByTestId('unifiedDocViewLogsOverviewDegradedFieldsAccordion')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('unifiedDocViewLogsOverviewDegradedFieldsTechPreview')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('unifiedDocViewLogsOverviewDegradedFieldTitleCount')
      ).toBeInTheDocument();

      // The accordion must be closed by default
      const accordion = screen.queryByTestId('unifiedDocViewLogsOverviewDegradedFieldsAccordion1');

      if (accordion === null) {
        return;
      }
      const button = accordion.querySelector('button');

      if (button === null) {
        return;
      }
      // Check the aria-expanded property of the button
      const isExpanded = button.getAttribute('aria-expanded');
      expect(isExpanded).toBe('false');

      button.click();
      expect(
        screen.queryByTestId('unifiedDocViewLogsOverviewDegradedFieldsQualityIssuesTable')
      ).toBeInTheDocument();
    });
  });
});

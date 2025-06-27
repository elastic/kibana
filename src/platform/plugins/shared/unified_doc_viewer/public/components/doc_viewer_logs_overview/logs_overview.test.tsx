/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogsOverview, LogsOverviewApi, LogsOverviewProps } from './logs_overview';
import { DataView } from '@kbn/data-views-plugin/common';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { setUnifiedDocViewerServices } from '../../plugin';
import { mockUnifiedDocViewerServices } from '../../__mocks__';
import { merge } from 'lodash';
import { DATA_QUALITY_DETAILS_LOCATOR_ID } from '@kbn/deeplinks-observability';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiCodeBlock: ({
    children,
    dangerouslySetInnerHTML,
  }: {
    children?: string;
    dangerouslySetInnerHTML?: { __html: string };
  }) => <code data-test-subj="codeBlock">{children ?? dangerouslySetInnerHTML?.__html ?? ''}</code>,
}));

const DATASET_NAME = 'logs.overview';
const NAMESPACE = 'default';
const DATA_STREAM_NAME = `logs-${DATASET_NAME}-${NAMESPACE}`;
const NOW = Date.now();
const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';
const STACKTRACE = 'Lorem ipsum dolor sit amet';
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

const buildHit = (fields: Record<string, unknown> = {}, customIndex: string = DATA_STREAM_NAME) =>
  buildDataTableRecord(
    {
      _index: customIndex,
      _id: customIndex,
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
        ...fields,
      },
      fields,
      ignored_field_values: {
        'cloud.availability_zone': [MORE_THAN_1024_CHARS],
      },
    },
    dataView
  );

const fullHit = buildHit();

const getCustomUnifedDocViewerServices = (params?: { showApm: boolean }) => ({
  core: {
    application: {
      capabilities: { apm: { show: params?.showApm || false } },
    },
  },
  share: {
    url: {
      locators: {
        get: () => ({ getRedirectUrl: jest.fn().mockReturnValue('/apm/foo'), navigate: jest.fn() }),
      },
    },
  },
});

setUnifiedDocViewerServices(
  merge(mockUnifiedDocViewerServices, getCustomUnifedDocViewerServices())
);

const renderLogsOverview = (
  props: Partial<LogsOverviewProps> = {},
  ref?: (api: LogsOverviewApi) => void
) => {
  const { rerender: baseRerender, ...tools } = render(
    <EuiProvider highContrastMode={false}>
      <LogsOverview ref={ref} dataView={dataView} hit={fullHit} {...props} />
    </EuiProvider>
  );

  const rerender = (rerenderProps: Partial<LogsOverviewProps>) =>
    baseRerender(
      <EuiProvider highContrastMode={false}>
        <LogsOverview ref={ref} dataView={dataView} hit={fullHit} {...props} {...rerenderProps} />
      </EuiProvider>
    );

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
      const accordions = screen.getAllByTestId('unifiedDocViewLogsOverviewDegradedFieldsAccordion');
      const accordion = accordions[0];
      const button = within(accordion).getByRole('button', { name: /quality issues/i });
      const user = userEvent.setup();
      expect(button.getAttribute('aria-expanded')).toBe('false');
      await user.click(button);
      expect(
        screen.queryByTestId('unifiedDocViewLogsOverviewDegradedFieldsQualityIssuesTable')
      ).toBeInTheDocument();
    });

    it('should render the dataset quality link for local indices', async () => {
      const sourceFields = {
        'data_stream.type': ['logs'],
        'data_stream.dataset': [DATASET_NAME],
        'data_stream.namespace': [NAMESPACE],
      };

      const hitWithDataStream = buildHit(sourceFields);

      const originalGet = mockUnifiedDocViewerServices.share.url.locators.get;
      mockUnifiedDocViewerServices.share.url.locators.get = jest.fn().mockImplementation((id) => {
        if (id === DATA_QUALITY_DETAILS_LOCATOR_ID) {
          return {
            getRedirectUrl: jest.fn().mockReturnValue('/data-quality'),
            navigate: jest.fn(),
          };
        }
        return originalGet(id);
      });

      renderLogsOverview({ hit: hitWithDataStream });

      const accordions = screen.getAllByTestId('unifiedDocViewLogsOverviewDegradedFieldsAccordion');
      const accordion = accordions[accordions.length - 1];
      const button = within(accordion).getByRole('button', { name: /quality issues/i });

      const user = userEvent.setup();
      await user.click(button);

      expect(
        screen.queryByTestId('unifiedDocViewLogsOverviewDegradedFieldDatasetLink')
      ).toBeInTheDocument();

      mockUnifiedDocViewerServices.share.url.locators.get = originalGet;
    });

    it('should not render the dataset quality link for CCS remote indices', async () => {
      const sourceFields = {
        'data_stream.type': ['logs'],
        'data_stream.dataset': [DATASET_NAME],
        'data_stream.namespace': [NAMESPACE],
      };

      const remoteHit = buildHit(sourceFields, `remoteCluster:${DATA_STREAM_NAME}`);

      const originalGet = mockUnifiedDocViewerServices.share.url.locators.get;
      mockUnifiedDocViewerServices.share.url.locators.get = jest.fn().mockImplementation((id) => {
        if (id === DATA_QUALITY_DETAILS_LOCATOR_ID) {
          return {
            getRedirectUrl: jest.fn().mockReturnValue('/data-quality'),
            navigate: jest.fn(),
          };
        }
        return originalGet(id);
      });

      renderLogsOverview({ hit: remoteHit });

      const accordions = screen.getAllByTestId('unifiedDocViewLogsOverviewDegradedFieldsAccordion');
      const accordion = accordions[accordions.length - 1];
      const button = within(accordion).getByRole('button', { name: /quality issues/i });

      const user = userEvent.setup();
      await user.click(button);
      expect(
        screen.queryByTestId('unifiedDocViewLogsOverviewDegradedFieldDatasetLink')
      ).not.toBeInTheDocument();

      mockUnifiedDocViewerServices.share.url.locators.get = originalGet;
    });
  });
});

describe('LogsOverview with accordion state', () => {
  it('should open the stacktrace section when the prop is passed', async () => {
    let api: LogsOverviewApi | undefined;
    renderLogsOverview({ hit: buildHit({ 'error.stack_trace': STACKTRACE }) }, (newApi) => {
      api = newApi;
    });
    act(() => {
      api?.openAndScrollToSection('stacktrace');
    });
    expect(
      screen.queryByTestId('unifiedDocViewLogsOverviewStacktraceAccordion')
    ).toBeInTheDocument();

    const accordion = screen.getByTestId('unifiedDocViewLogsOverviewStacktraceAccordion');
    const button = within(accordion).getByRole('button', { name: /stacktrace/i });
    // Check the aria-expanded property of the button
    const isExpanded = button.getAttribute('aria-expanded');
    expect(isExpanded).toBe('true');
  });

  it('should open the quality_issues section when the prop is passed', async () => {
    let api: LogsOverviewApi | undefined;
    renderLogsOverview({ hit: buildHit({ 'error.stack_trace': STACKTRACE }) }, (newApi) => {
      api = newApi;
    });
    act(() => {
      api?.openAndScrollToSection('quality_issues');
    });
    expect(
      screen.queryByTestId('unifiedDocViewLogsOverviewDegradedFieldsAccordion')
    ).toBeInTheDocument();

    const accordion = screen.getByTestId('unifiedDocViewLogsOverviewDegradedFieldsAccordion');
    const button = within(accordion).getByRole('button', { name: /quality issues/i });
    // Check the aria-expanded property of the button
    const isExpanded = button.getAttribute('aria-expanded');
    expect(isExpanded).toBe('true');
  });
});

describe('LogsOverview with APM links', () => {
  describe('Highlights section', () => {
    describe('When APM is enabled', () => {
      beforeEach(() => {
        setUnifiedDocViewerServices(
          merge(
            mockUnifiedDocViewerServices,
            getCustomUnifedDocViewerServices({
              showApm: true,
            })
          )
        );
        renderLogsOverview();
      });
      it('should not render service name link', () => {
        expect(
          screen.queryByTestId('unifiedDocViewLogsOverviewServiceNameHighlightLink')
        ).not.toBeInTheDocument();
      });

      it('should render trace id link', () => {
        expect(
          screen.queryByTestId('unifiedDocViewLogsOverviewTraceIdHighlightLink')
        ).toBeInTheDocument();
      });
    });
  });
});

describe('LogsOverview content breakdown', () => {
  it('should render message value', async () => {
    const message = 'This is a message';
    renderLogsOverview({ hit: buildHit({ message }) });
    expect(screen.queryByTestId('codeBlock')?.innerHTML).toBe(message);
  });

  it('should render formatted JSON message value', async () => {
    const json = { foo: { bar: true } };
    const message = JSON.stringify(json);
    renderLogsOverview({ hit: buildHit({ message }) });
    expect(screen.queryByTestId('codeBlock')?.innerHTML).toBe(JSON.stringify(json, null, 2));
  });
});

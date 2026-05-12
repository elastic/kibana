/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { EnvironmentHealthResponse } from '../../../../common/environment_health';
import { MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME } from '../../../../common/environment_health';
import {
  MANAGEMENT_LANDING_PENDING_REPORTS_FALLBACK_COUNT,
  ManagementLandingHeaderDescription,
  ManagementLandingHealthBadge,
  ManagementLandingHealthyReassurance,
} from './management_landing_env_widgets';

const managementCapsIndex = {
  catalogue: { monitoring: true },
  management: {
    data: { index_management: true },
  },
} as any;

const headerDescriptionCaps = {} as any;

describe('ManagementLandingHeader environment widgets', () => {
  const navigateToApp = jest.fn();

  beforeEach(() => {
    navigateToApp.mockClear();
  });

  test('HealthBadge shows status when provided', () => {
    render(
      <I18nProvider>
        <ManagementLandingHealthBadge status="green" />
      </I18nProvider>
    );
    expect(screen.getByTestId('managementEnvHealthClusterStatus')).toHaveTextContent('green');
  });

  test('Header description shows stats when data is ready', () => {
    const data: EnvironmentHealthResponse = {
      clusterName: MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME,
      healthStatus: 'green',
      indicesCount: 3,
      dataStreamsCount: 2,
      activeRulesCount: 7,
      attentionReasons: [],
    };

    render(
      <I18nProvider>
        <ManagementLandingHeaderDescription
          loadState="ready"
          data={data}
          capabilities={headerDescriptionCaps}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('managementEnvHealthIndices')).toHaveTextContent('3');
    expect(screen.getByTestId('managementEnvHealthDataStreams')).toHaveTextContent('2');
    expect(screen.getByTestId('managementEnvHealthActiveRules')).toHaveTextContent('7');
    expect(screen.getByTestId('managementEnvHealthPendingReports')).toHaveTextContent(
      String(MANAGEMENT_LANDING_PENDING_REPORTS_FALLBACK_COUNT)
    );
    expect(screen.getByTestId('managementEnvHealthPendingReports')).toHaveTextContent('demo count');
  });

  test('Header description omits demo note when API supplies pendingReportsCount', () => {
    const data: EnvironmentHealthResponse = {
      clusterName: MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME,
      healthStatus: 'green',
      indicesCount: 3,
      dataStreamsCount: 2,
      activeRulesCount: 7,
      pendingReportsCount: 5,
      attentionReasons: [],
    };

    render(
      <I18nProvider>
        <ManagementLandingHeaderDescription
          loadState="ready"
          data={data}
          capabilities={headerDescriptionCaps}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId('managementEnvHealthPendingReports')).toHaveTextContent('5');
    expect(screen.queryByText(/demo count/i)).not.toBeInTheDocument();
  });

  test('Healthy reassurance renders', () => {
    render(
      <I18nProvider>
        <ManagementLandingHealthyReassurance />
      </I18nProvider>
    );
    expect(screen.getByTestId('managementEnvHealthHealthyReassurance')).toBeInTheDocument();
  });

  test('Attention issues stat is omitted when there are no reasons', () => {
    const data: EnvironmentHealthResponse = {
      clusterName: MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME,
      healthStatus: 'green',
      indicesCount: 1,
      dataStreamsCount: 1,
      activeRulesCount: 1,
      attentionReasons: [],
    };
    render(
      <I18nProvider>
        <ManagementLandingHeaderDescription
          loadState="ready"
          data={data}
          capabilities={managementCapsIndex}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );
    expect(
      screen.queryByTestId('managementEnvHealthAttentionIssuesTrigger')
    ).not.toBeInTheDocument();
    const statsPanel = screen.getByTestId('managementLandingStatsPanel');
    expect(
      within(statsPanel).getByTestId('managementEnvHealthHealthyReassurance')
    ).toBeInTheDocument();
  });

  test('Attention issues stat shows summary and details inside popover for a single reason', () => {
    const data: EnvironmentHealthResponse = {
      clusterName: MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME,
      healthStatus: 'red',
      indicesCount: 1,
      dataStreamsCount: 1,
      activeRulesCount: 1,
      attentionReasons: ['cluster_red'],
    };
    render(
      <I18nProvider>
        <ManagementLandingHeaderDescription
          loadState="ready"
          data={data}
          capabilities={managementCapsIndex}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );
    const attentionStat = screen.getByTestId('managementEnvHealthAttentionIssuesStat');
    expect(within(attentionStat).getByRole('heading', { level: 3 })).toHaveTextContent('1');
    expect(screen.getByTestId('managementEnvHealthAttentionIssuesTrigger')).toHaveTextContent(
      'issue needs attention'
    );
    fireEvent.click(screen.getByTestId('managementEnvHealthAttentionIssuesTrigger'));
    expect(screen.getByTestId('managementEnvHealthAttentionIssuesPopoverList')).toHaveTextContent(
      'Cluster health is red'
    );
    expect(screen.getAllByTestId('managementEnvHealthAttentionIssueRow')).toHaveLength(1);
  });

  test('Attention issues stat lists multiple reasons in the popover', () => {
    const data: EnvironmentHealthResponse = {
      clusterName: MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME,
      healthStatus: 'yellow',
      indicesCount: 1,
      dataStreamsCount: 1,
      activeRulesCount: 1,
      attentionReasons: ['cluster_yellow', 'unassigned_shards'],
    };
    render(
      <I18nProvider>
        <ManagementLandingHeaderDescription
          loadState="ready"
          data={data}
          capabilities={managementCapsIndex}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );
    const attentionStat = screen.getByTestId('managementEnvHealthAttentionIssuesStat');
    expect(within(attentionStat).getByRole('heading', { level: 3 })).toHaveTextContent('2');
    expect(screen.getByTestId('managementEnvHealthAttentionIssuesTrigger')).toHaveTextContent(
      'issues need attention'
    );
    fireEvent.click(screen.getByTestId('managementEnvHealthAttentionIssuesTrigger'));
    const list = screen.getByTestId('managementEnvHealthAttentionIssuesPopoverList');
    expect(list).toHaveTextContent('Cluster health is yellow');
    expect(list).toHaveTextContent('There are unassigned shards');
    expect(list).toHaveTextContent('Open Stack Monitoring');
    expect(screen.getAllByTestId('managementEnvHealthAttentionIssueRow')).toHaveLength(2);
  });

  test('Attention cluster_red navigates to Stack Monitoring when catalogue allows', () => {
    const data: EnvironmentHealthResponse = {
      clusterName: MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME,
      healthStatus: 'red',
      indicesCount: 1,
      dataStreamsCount: 1,
      activeRulesCount: 1,
      attentionReasons: ['cluster_red'],
    };
    render(
      <I18nProvider>
        <ManagementLandingHeaderDescription
          loadState="ready"
          data={data}
          capabilities={managementCapsIndex}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementEnvHealthAttentionIssuesTrigger'));
    fireEvent.click(screen.getByTestId('managementEnvHealthAttentionAction-monitoring-default'));
    expect(navigateToApp).toHaveBeenCalledWith('monitoring', {});
  });

  test('Attention unassigned_shards navigates to Index Management indices', () => {
    const data: EnvironmentHealthResponse = {
      clusterName: MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME,
      healthStatus: 'yellow',
      indicesCount: 1,
      dataStreamsCount: 1,
      activeRulesCount: 1,
      attentionReasons: ['unassigned_shards'],
    };
    render(
      <I18nProvider>
        <ManagementLandingHeaderDescription
          loadState="ready"
          data={data}
          capabilities={managementCapsIndex}
          navigateToApp={navigateToApp}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('managementEnvHealthAttentionIssuesTrigger'));
    fireEvent.click(
      screen.getByTestId(
        'managementEnvHealthAttentionAction-management-data_index_management_indices'
      )
    );
    expect(navigateToApp).toHaveBeenCalledWith('management', {
      path: 'data/index_management/indices',
    });
  });
});

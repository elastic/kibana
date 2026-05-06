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
import { I18nProvider } from '@kbn/i18n-react';
import type { EnvironmentHealthResponse } from '../../../../common/environment_health';
import { MANAGEMENT_LANDING_DEFAULT_CLUSTER_DISPLAY_NAME } from '../../../../common/environment_health';
import {
  ManagementAttentionCallout,
  ManagementLandingHeaderDescription,
  ManagementLandingHealthBadge,
} from './management_landing_env_widgets';

describe('ManagementLandingHeader environment widgets', () => {
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
        <ManagementLandingHeaderDescription loadState="ready" data={data} />
      </I18nProvider>
    );

    expect(screen.getByTestId('managementEnvHealthIndices')).toHaveTextContent('3');
    expect(screen.getByTestId('managementEnvHealthDataStreams')).toHaveTextContent('2');
    expect(screen.getByTestId('managementEnvHealthActiveRules')).toHaveTextContent('7');
  });

  test('AttentionCallout renders nothing when no reasons', () => {
    const { container } = render(
      <I18nProvider>
        <ManagementAttentionCallout reasons={[]} />
      </I18nProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('AttentionCallout renders a single reason without a list', () => {
    render(
      <I18nProvider>
        <ManagementAttentionCallout reasons={['cluster_red']} />
      </I18nProvider>
    );
    const callout = screen.getByTestId('managementEnvHealthAttentionCallout');
    expect(callout).toHaveTextContent('Cluster health is red');
    expect(callout.querySelector('ul')).toBeNull();
  });

  test('AttentionCallout renders multiple reasons as a list', () => {
    render(
      <I18nProvider>
        <ManagementAttentionCallout reasons={['cluster_yellow', 'unassigned_shards']} />
      </I18nProvider>
    );
    const callout = screen.getByTestId('managementEnvHealthAttentionCallout');
    expect(callout).toHaveTextContent('Cluster health is yellow');
    expect(callout).toHaveTextContent('There are unassigned shards');
    expect(callout.querySelectorAll('li')).toHaveLength(2);
  });
});

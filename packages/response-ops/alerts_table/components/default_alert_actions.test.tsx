/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DefaultAlertActions } from './default_alert_actions';
import { render, screen } from '@testing-library/react';
import { AdditionalContext, AlertActionsProps, RenderContext } from '../types';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { createPartialObjectMock } from '../utils/test';
import { AlertsTableContextProvider } from '../contexts/alerts_table_context';

jest.mock('@kbn/alerts-ui-shared/src/common/hooks/use_load_rule_types_query', () => ({
  useLoadRuleTypesQuery: jest.fn(),
}));
jest.mock('./view_rule_details_alert_action', () => {
  return {
    ViewRuleDetailsAlertAction: () => (
      <div data-test-subj="viewRuleDetailsAlertAction">{'ViewRuleDetailsAlertAction'}</div>
    ),
  };
});
jest.mock('./view_alert_details_alert_action', () => {
  return {
    ViewAlertDetailsAlertAction: () => (
      <div data-test-subj="viewAlertDetailsAlertAction">{'ViewAlertDetailsAlertAction'}</div>
    ),
  };
});
jest.mock('./mute_alert_action', () => {
  return { MuteAlertAction: () => <div data-test-subj="muteAlertAction">{'MuteAlertAction'}</div> };
});
jest.mock('./mark_as_untracked_alert_action', () => {
  return {
    MarkAsUntrackedAlertAction: () => (
      <div data-test-subj="markAsUntrackedAlertAction">{'MarkAsUntrackedAlertAction'}</div>
    ),
  };
});

const { useLoadRuleTypesQuery } = jest.requireMock(
  '@kbn/alerts-ui-shared/src/common/hooks/use_load_rule_types_query'
);

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
const props = createPartialObjectMock<AlertActionsProps>({
  alert: {},
  refresh: jest.fn(),
});

const context = createPartialObjectMock<RenderContext<AdditionalContext>>({
  services: {
    http,
    notifications,
  },
});

const TestComponent = (_props: AlertActionsProps) => (
  <AlertsTableContextProvider value={context}>
    <DefaultAlertActions {..._props} />
  </AlertsTableContextProvider>
);

describe('DefaultAlertActions', () => {
  it('should show "Mute" and "Marked as untracked" option', async () => {
    useLoadRuleTypesQuery.mockReturnValue({ authorizedToCreateAnyRules: true });

    render(<TestComponent {...props} />);

    expect(await screen.findByText('MuteAlertAction')).toBeInTheDocument();
    expect(await screen.findByText('MarkAsUntrackedAlertAction')).toBeInTheDocument();
  });

  it('should hide "Mute" and "Marked as untracked" option', async () => {
    useLoadRuleTypesQuery.mockReturnValue({ authorizedToCreateAnyRules: false });

    render(<TestComponent {...props} />);

    expect(screen.queryByText('MuteAlertAction')).not.toBeInTheDocument();
    expect(screen.queryByText('MarkAsUntrackedAlertAction')).not.toBeInTheDocument();
  });
});

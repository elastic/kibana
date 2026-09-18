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
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ConnectorSpecResponse } from '../apis/fetch_connector_spec';
import { SpecActionParamsFields } from './spec_action_params_fields';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const multiActionSpec = (): ConnectorSpecResponse => ({
  metadata: {
    id: '.slack2',
    displayName: 'Slack (v2)',
    description: 'Slack',
    minimumLicense: 'gold',
    supportedFeatureIds: ['alerting'],
  },
  schema: { type: 'object', properties: {} },
  actions: {
    searchMessages: {
      input: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query' } },
      },
      description: 'Search messages',
      scope: 'read',
    },
    sendMessage: {
      input: {
        type: 'object',
        required: ['channel', 'text'],
        properties: {
          channel: { type: 'string', minLength: 1, description: 'Conversation ID' },
          text: { type: 'string', minLength: 1, description: 'The message text to send' },
          unfurlLinks: { type: 'boolean', description: 'Unfurl text links' },
        },
      },
      description: 'Send a message',
      scope: 'write',
    },
  },
  alerting: { defaultAction: 'sendMessage', messageField: 'text' },
  isTestable: true,
});

const singleActionSpec = (): ConnectorSpecResponse => {
  const spec = multiActionSpec();
  return {
    ...spec,
    actions: { sendMessage: spec.actions.sendMessage },
  };
};

describe('SpecActionParamsFields', () => {
  it('renders an action selector for multi-action specs', () => {
    render(
      <SpecActionParamsFields
        spec={multiActionSpec()}
        actionParams={{ subAction: 'sendMessage', subActionParams: {} }}
        editAction={jest.fn()}
        index={0}
        errors={{}}
      />,
      { wrapper }
    );

    expect(screen.getByTestId('specActionParams-subAction')).toBeInTheDocument();
  });

  it('hides the action selector for a single-action spec', () => {
    render(
      <SpecActionParamsFields
        spec={singleActionSpec()}
        actionParams={{ subAction: 'sendMessage', subActionParams: {} }}
        editAction={jest.fn()}
        index={0}
        errors={{}}
      />,
      { wrapper }
    );

    expect(screen.queryByTestId('specActionParams-subAction')).not.toBeInTheDocument();
  });

  it('renders a boolean switch for boolean input fields', () => {
    render(
      <SpecActionParamsFields
        spec={singleActionSpec()}
        actionParams={{ subAction: 'sendMessage', subActionParams: {} }}
        editAction={jest.fn()}
        index={0}
        errors={{}}
      />,
      { wrapper }
    );

    expect(screen.getByTestId('generator-field-unfurlLinks')).toBeInTheDocument();
  });

  it('calls editAction with subActionParams when a string field changes', async () => {
    const user = userEvent.setup();
    const editAction = jest.fn();

    render(
      <SpecActionParamsFields
        spec={singleActionSpec()}
        actionParams={{ subAction: 'sendMessage', subActionParams: {} }}
        editAction={editAction}
        index={0}
        errors={{}}
      />,
      { wrapper }
    );

    await user.type(screen.getByTestId('generator-field-channel'), 'C123');

    await waitFor(() => {
      expect(editAction).toHaveBeenCalledWith(
        'subActionParams',
        expect.objectContaining({ channel: 'C123' }),
        0
      );
    });
  });

  it('resets subActionParams when the selected action changes', async () => {
    const user = userEvent.setup();
    const editAction = jest.fn();

    render(
      <SpecActionParamsFields
        spec={multiActionSpec()}
        actionParams={{ subAction: 'sendMessage', subActionParams: { text: 'hi' } }}
        editAction={editAction}
        index={0}
        errors={{}}
      />,
      { wrapper }
    );

    await user.click(screen.getByTestId('specActionParams-subAction'));
    await user.click(await screen.findByText(/searchMessages/));

    expect(editAction).toHaveBeenCalledWith('subAction', 'searchMessages', 0);
    expect(editAction).toHaveBeenCalledWith('subActionParams', {}, 0);
  });
});

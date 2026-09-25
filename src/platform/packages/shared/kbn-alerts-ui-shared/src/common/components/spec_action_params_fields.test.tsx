/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { isEqual } from 'lodash';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { ConnectorSpecResponse } from '../apis/fetch_connector_spec';
import type { SpecActionParams } from '../types/spec_action_params';
import { validateSpecActionParams } from '../utils/spec_action_params_schema';
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
        additionalProperties: false,
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
        additionalProperties: false,
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

/**
 * Mirrors the rule form host: `editAction` spreads the params captured by the current render, so
 * two calls in the same tick overwrite each other. Exposes the latest params through `onParams`.
 */
const StatefulHost = ({
  spec,
  initialParams,
  onParams,
  defaultMessage,
}: {
  spec: ConnectorSpecResponse;
  initialParams: SpecActionParams;
  onParams: (params: SpecActionParams) => void;
  defaultMessage?: string;
}) => {
  const [params, setParams] = useState<SpecActionParams>(initialParams);
  onParams(params);
  const editAction = (key: string, value: unknown) => {
    setParams({ ...params, [key]: value });
  };
  return (
    <SpecActionParamsFields
      spec={spec}
      actionParams={params}
      editAction={editAction}
      index={0}
      errors={{}}
      defaultMessage={defaultMessage}
    />
  );
};

const hasErrors = (errors: Record<string, unknown>) =>
  Object.values(errors).some((messages) => Array.isArray(messages) && messages.length > 0);

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

  it('shows the action name as the selected value and its description as help text', () => {
    const spec = multiActionSpec();
    render(
      <SpecActionParamsFields
        spec={spec}
        actionParams={{ subAction: 'sendMessage', subActionParams: {} }}
        editAction={jest.fn()}
        index={0}
        errors={{}}
      />,
      { wrapper }
    );

    const select = screen.getByTestId('specActionParams-subAction');
    expect(within(select).getByText('sendMessage')).toBeInTheDocument();
    expect(within(select).queryByText(/Send a message/)).not.toBeInTheDocument();
    expect(screen.getByText('Send a message')).toBeInTheDocument();
  });

  it('lists action names with their descriptions in the dropdown', async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByTestId('specActionParams-subAction'));

    const option = await screen.findByRole('option', { name: /searchMessages/ });
    expect(within(option).getByText('searchMessages')).toBeInTheDocument();
    expect(within(option).getByText('Search messages')).toBeInTheDocument();
  });

  it('resets subActionParams when the selected action changes', async () => {
    const user = userEvent.setup();
    let latest: SpecActionParams = {};

    render(
      <StatefulHost
        spec={multiActionSpec()}
        initialParams={{ subAction: 'sendMessage', subActionParams: { channel: 'C1', text: 'hi' } }}
        onParams={(params) => {
          latest = params;
        }}
      />,
      { wrapper }
    );

    await user.click(screen.getByTestId('specActionParams-subAction'));
    await user.click(await screen.findByRole('option', { name: /searchMessages/ }));

    await waitFor(() => {
      expect(latest).toEqual({ subAction: 'searchMessages', subActionParams: {} });
    });
    expect(screen.getByTestId('generator-field-query')).toHaveValue('');
    expect(hasErrors((await validateSpecActionParams(multiActionSpec(), latest)).errors)).toBe(
      false
    );
  });

  it('leaves no stuck error after switching action and filling the new field', async () => {
    const user = userEvent.setup();
    const spec = multiActionSpec();
    let latest: SpecActionParams = {};
    const paramsHistory: SpecActionParams[] = [];

    render(
      <StatefulHost
        spec={spec}
        initialParams={{ subAction: 'sendMessage', subActionParams: { channel: 'C1', text: 'hi' } }}
        onParams={(params) => {
          latest = params;
          if (!isEqual(paramsHistory[paramsHistory.length - 1], params)) {
            paramsHistory.push(params);
          }
        }}
      />,
      { wrapper }
    );

    await user.click(screen.getByTestId('specActionParams-subAction'));
    await user.click(await screen.findByRole('option', { name: /searchMessages/ }));
    await waitFor(() => {
      expect(latest).toEqual({ subAction: 'searchMessages', subActionParams: {} });
    });

    await user.type(screen.getByTestId('generator-field-query'), 'deploy');
    await waitFor(() => {
      expect(latest).toEqual({ subAction: 'searchMessages', subActionParams: { query: 'deploy' } });
    });

    // The host commits the new action before the inner form resets the params, so one snapshot
    // carries the old sendMessage params under searchMessages. The rule form validates that too.
    expect(paramsHistory).toContainEqual({
      subAction: 'searchMessages',
      subActionParams: { channel: 'C1', text: 'hi' },
    });

    let merged: Record<string, unknown> = {};
    for (const params of paramsHistory) {
      const { errors } = await validateSpecActionParams(spec, params);
      merged = { ...merged, ...errors };
    }
    const finalResult = await validateSpecActionParams(spec, latest);
    expect(finalResult.errors.subActionParams).toEqual([]);
    expect(hasErrors(finalResult.errors)).toBe(false);
    expect(hasErrors(merged)).toBe(false);
  });

  it('applies the default action, fills required fields, and ends with no validation errors', async () => {
    const user = userEvent.setup();
    const spec = multiActionSpec();
    let latest: SpecActionParams = {};

    render(
      <StatefulHost
        spec={spec}
        initialParams={{}}
        defaultMessage="Rule fired"
        onParams={(params) => {
          latest = params;
        }}
      />,
      { wrapper }
    );

    await waitFor(() => {
      expect(latest.subAction).toBe('sendMessage');
    });
    expect(hasErrors((await validateSpecActionParams(spec, latest)).errors)).toBe(true);

    await user.type(screen.getByTestId('generator-field-channel'), 'C123');

    await waitFor(() => {
      expect(latest).toEqual({
        subAction: 'sendMessage',
        subActionParams: { channel: 'C123', text: 'Rule fired' },
      });
    });
    expect(hasErrors((await validateSpecActionParams(spec, latest)).errors)).toBe(false);
  });

  it('shows the add-variable button for string fields and inserts a variable', async () => {
    const user = userEvent.setup();
    const editAction = jest.fn();

    render(
      <SpecActionParamsFields
        spec={singleActionSpec()}
        actionParams={{
          subAction: 'sendMessage',
          subActionParams: { channel: 'C1', text: 'hello' },
        }}
        editAction={editAction}
        index={0}
        errors={{}}
        messageVariables={[{ name: 'alert.id', description: 'Alert id' }]}
      />,
      { wrapper }
    );

    await user.click(screen.getByTestId('textAddVariableButton'));
    await user.click(await screen.findByTestId('alert.id-selectableOption'));

    await waitFor(() => {
      expect(editAction).toHaveBeenCalledWith(
        'subActionParams',
        expect.objectContaining({ text: 'hello{{alert.id}}' }),
        0
      );
    });
  });

  it('pre-fills the message field with defaultMessage when empty', async () => {
    const editAction = jest.fn();

    render(
      <SpecActionParamsFields
        spec={singleActionSpec()}
        actionParams={{ subAction: 'sendMessage', subActionParams: {} }}
        editAction={editAction}
        index={0}
        errors={{}}
        defaultMessage="Rule fired"
      />,
      { wrapper }
    );

    await waitFor(() => {
      expect(screen.getByTestId('generator-field-text')).toHaveValue('Rule fired');
    });
    await waitFor(() => {
      expect(editAction).toHaveBeenCalledWith(
        'subActionParams',
        expect.objectContaining({ text: 'Rule fired' }),
        0
      );
    });
  });

  it('re-applies defaultMessage when useDefaultMessage toggles', async () => {
    const editAction = jest.fn();
    const spec = singleActionSpec();
    const props = {
      spec,
      actionParams: { subAction: 'sendMessage' as const, subActionParams: { text: 'custom' } },
      editAction,
      index: 0,
      errors: {},
      defaultMessage: 'Rule fired',
    };

    const { rerender } = render(<SpecActionParamsFields {...props} useDefaultMessage={false} />, {
      wrapper,
    });

    expect(screen.getByTestId('generator-field-text')).toHaveValue('custom');

    rerender(<SpecActionParamsFields {...props} useDefaultMessage={true} />);

    await waitFor(() => {
      expect(screen.getByTestId('generator-field-text')).toHaveValue('Rule fired');
    });
  });

  it('does not pre-fill when the spec has no messageField', async () => {
    const spec = singleActionSpec();
    delete spec.alerting;

    render(
      <SpecActionParamsFields
        spec={spec}
        actionParams={{ subAction: 'sendMessage', subActionParams: {} }}
        editAction={jest.fn()}
        index={0}
        errors={{}}
        defaultMessage="Rule fired"
      />,
      { wrapper }
    );

    expect(screen.getByTestId('generator-field-text')).toHaveValue('');
  });
});

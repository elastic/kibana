/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sendWaitForInputNotifications } from './send_wait_for_input_notifications';

describe('sendWaitForInputNotifications', () => {
  const renderTemplate = (template: string) => template;

  it('sends slack_api #channel values as channelNames and ids as channelIds', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        slack_api: { 'connector-id': 'slack-api-1', channels: ['#alerts', 'C0123'] },
      },
      stepMessage: 'Please provide input',
      formUrl: 'https://kibana.example/form',
      renderTemplate,
      connectorExecutor: { execute } as never,
      abortController: new AbortController(),
    });

    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[0][0].connectorType).toBe('slack_api');
    expect(execute.mock.calls[0][0].input.subActionParams).toEqual(
      expect.objectContaining({ channelNames: ['#alerts'] })
    );
    expect(execute.mock.calls[1][0].input.subActionParams).toEqual(
      expect.objectContaining({ channelIds: ['C0123'] })
    );
  });

  it('sends a Kibana-style email notification with Open form markdown and footer path', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        email: { 'connector-id': 'email-1', to: ['analyst@example.com'] },
      },
      stepMessage: 'Please provide input',
      formUrl:
        'https://kibana.example/s/space/api/workflows/executions/e1/steps/s1/resume/external/form?token=abc',
      renderTemplate,
      connectorExecutor: { execute } as never,
      abortController: new AbortController(),
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toEqual({
      connectorType: 'email',
      connectorNameOrId: 'email-1',
      input: {
        to: ['analyst@example.com'],
        subject: 'Input required',
        message:
          'Please provide input\n\n[Open form](https://kibana.example/s/space/api/workflows/executions/e1/steps/s1/resume/external/form?token=abc)',
        kibanaFooterLink: {
          path: '/s/space/api/workflows/executions/e1/steps/s1/resume/external/form?token=abc',
          text: 'View in Kibana',
        },
      },
      abortController: expect.any(AbortController),
    });
  });

  it('sends slack2 sendMessage with default Open form mrkdwn and optional message override', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        slack2: { 'connector-id': 'slack2-1', channels: ['C0123'] },
      },
      stepMessage: 'Please provide input',
      formUrl: 'https://kibana.example/form?token=abc&x=1',
      renderTemplate,
      connectorExecutor: { execute } as never,
      abortController: new AbortController(),
    });

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        connectorType: 'slack2',
        input: {
          subAction: 'sendMessage',
          subActionParams: {
            channel: 'C0123',
            text: 'Please provide input\n\n<https://kibana.example/form?token=abc&amp;x=1|Open form>',
          },
        },
      })
    );

    execute.mockClear();
    await sendWaitForInputNotifications({
      channels: {
        slack2: {
          'connector-id': 'slack2-1',
          channels: ['C0123'],
          message: 'Custom: {{context.hitl.externalFormLink}}',
        },
      },
      stepMessage: 'Please provide input',
      formUrl: 'https://kibana.example/form',
      renderTemplate: (template) =>
        template.replace('{{context.hitl.externalFormLink}}', 'https://kibana.example/form'),
      connectorExecutor: { execute } as never,
      abortController: new AbortController(),
    });

    expect(execute.mock.calls[0][0].input.subActionParams.text).toBe(
      'Custom: https://kibana.example/form'
    );
  });
});

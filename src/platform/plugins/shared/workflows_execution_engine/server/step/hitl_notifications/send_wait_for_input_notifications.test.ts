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
      kibanaUrl: 'https://kibana.example',
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
      kibanaUrl: 'https://kibana.example',
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

  it('sends a rendered email subject and custom message', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        email: {
          'connector-id': 'email-1',
          to: ['analyst@example.com'],
          subject: 'Ticket for {{inputs.hostname}}',
          message: 'Open {{context.hitl.externalFormLink}}',
        },
      },
      stepMessage: 'Please provide input',
      formUrl: 'https://kibana.example/form',
      kibanaUrl: 'https://kibana.example',
      renderTemplate: (template) =>
        template
          .replaceAll('{{inputs.hostname}}', 'web-01')
          .replaceAll('{{context.hitl.externalFormLink}}', 'https://kibana.example/form'),
      connectorExecutor: { execute } as never,
      abortController: new AbortController(),
    });

    expect(execute.mock.calls[0][0].input.subject).toBe('Ticket for web-01');
    expect(execute.mock.calls[0][0].input.message).toBe('Open https://kibana.example/form');
  });

  it('renders email recipients and drops a blank address', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        email: {
          'connector-id': 'email-1',
          to: ['{{inputs.email}}', '{{inputs.empty}}'],
          cc: ['{{inputs.cc}}'],
          bcc: ['audit@example.com'],
        },
      },
      stepMessage: 'Please provide input',
      formUrl: 'https://kibana.example/form',
      kibanaUrl: 'https://kibana.example',
      renderTemplate: (template) =>
        template
          .replaceAll('{{inputs.email}}', 'analyst@example.com')
          .replaceAll('{{inputs.empty}}', '  ')
          .replaceAll('{{inputs.cc}}', 'lead@example.com'),
      connectorExecutor: { execute } as never,
      abortController: new AbortController(),
    });

    expect(execute.mock.calls[0][0].input.to).toEqual(['analyst@example.com']);
    expect(execute.mock.calls[0][0].input.cc).toEqual(['lead@example.com']);
    expect(execute.mock.calls[0][0].input.bcc).toEqual(['audit@example.com']);
  });

  it('throws when every email recipient renders blank', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await expect(
      sendWaitForInputNotifications({
        channels: {
          email: {
            'connector-id': 'email-1',
            to: ['{{inputs.email}}'],
          },
        },
        stepMessage: 'Please provide input',
        formUrl: 'https://kibana.example/form',
        kibanaUrl: 'https://kibana.example',
        renderTemplate: () => '  ',
        connectorExecutor: { execute } as never,
        abortController: new AbortController(),
      })
    ).rejects.toThrow('HITL email "to" rendered to an empty list');
    expect(execute).not.toHaveBeenCalled();
  });

  it('sends slack2 sendMessage with default Open form mrkdwn and optional message override', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        slack2: { 'connector-id': 'slack2-1', channels: ['C0123'] },
      },
      stepMessage: 'Please provide input',
      formUrl: 'https://kibana.example/form?token=abc&x=1',
      kibanaUrl: 'https://kibana.example',
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
            unfurlLinks: false,
            unfurlMedia: false,
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
      kibanaUrl: 'https://kibana.example',
      renderTemplate: (template) =>
        template.replace('{{context.hitl.externalFormLink}}', 'https://kibana.example/form'),
      connectorExecutor: { execute } as never,
      abortController: new AbortController(),
    });

    expect(execute.mock.calls[0][0].input.subActionParams.text).toBe(
      'Custom: https://kibana.example/form'
    );
  });

  it('posts a rendered form link through the HTTP system connector', async () => {
    const executeSystemConnector = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        http: {
          url: 'https://hooks.example/{{context.hitl.externalFormLink}}',
          method: 'PUT',
          headers: {
            'X-Form': '{{context.hitl.externalFormLink}}',
            'X-{{inputs.tenant}}': 'soc',
          },
          body: '{"form":"{{context.hitl.externalFormLink}}"}',
        },
      },
      stepMessage: 'Please provide input',
      formUrl: 'https://kibana.example/form',
      kibanaUrl: 'https://kibana.example',
      renderTemplate: (template) =>
        template
          .replaceAll('{{context.hitl.externalFormLink}}', 'https://kibana.example/form')
          .replaceAll('{{inputs.tenant}}', 'acme'),
      connectorExecutor: { executeSystemConnector } as never,
      abortController: new AbortController(),
    });

    expect(executeSystemConnector).toHaveBeenCalledWith({
      connectorType: '.http-system',
      input: {
        url: 'https://hooks.example/https://kibana.example/form',
        method: 'PUT',
        headers: { 'X-Form': 'https://kibana.example/form', 'X-acme': 'soc' },
        body: '{"form":"https://kibana.example/form"}',
      },
      abortController: expect.any(AbortController),
    });
  });

  it('posts through a saved HTTP connector when connector-id is set', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });
    const executeSystemConnector = jest.fn();

    await sendWaitForInputNotifications({
      channels: {
        http: {
          'connector-id': 'http-1',
          url: 'https://hooks.example/hitl',
          body: 'ping',
        },
      },
      stepMessage: 'Please provide input',
      formUrl: 'https://kibana.example/form',
      kibanaUrl: 'https://kibana.example',
      renderTemplate: (template) => template,
      connectorExecutor: { execute, executeSystemConnector } as never,
      abortController: new AbortController(),
    });

    expect(execute).toHaveBeenCalledWith({
      connectorType: 'http',
      connectorNameOrId: 'http-1',
      input: {
        url: 'https://hooks.example/hitl',
        method: 'POST',
        body: 'ping',
      },
      abortController: expect.any(AbortController),
    });
    expect(executeSystemConnector).not.toHaveBeenCalled();
  });

  it('sends a GET path through a saved HTTP connector without a body', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        http: {
          'connector-id': 'http-1',
          path: '/hitl?form={{context.hitl.externalFormLink}}',
          method: 'GET',
        },
      },
      stepMessage: 'Please provide input',
      formUrl: 'https://kibana.example/form',
      kibanaUrl: 'https://kibana.example',
      renderTemplate: (template) =>
        template.replaceAll('{{context.hitl.externalFormLink}}', 'https://kibana.example/form'),
      connectorExecutor: { execute, executeSystemConnector: jest.fn() } as never,
      abortController: new AbortController(),
    });

    expect(execute).toHaveBeenCalledWith({
      connectorType: 'http',
      connectorNameOrId: 'http-1',
      input: {
        path: '/hitl?form=https://kibana.example/form',
        method: 'GET',
      },
      abortController: expect.any(AbortController),
    });
  });

  it('rejects an HTTP header name that renders empty', async () => {
    await expect(
      sendWaitForInputNotifications({
        channels: {
          http: {
            url: 'https://hooks.example/hitl',
            headers: { '{{inputs.tenant}}': 'soc' },
            body: 'ping',
          },
        },
        stepMessage: 'Please provide input',
        formUrl: 'https://kibana.example/form',
        kibanaUrl: 'https://kibana.example',
        renderTemplate: () => '',
        connectorExecutor: { executeSystemConnector: jest.fn() } as never,
        abortController: new AbortController(),
      })
    ).rejects.toThrow('HTTP HITL header name rendered to an empty string');
  });
});

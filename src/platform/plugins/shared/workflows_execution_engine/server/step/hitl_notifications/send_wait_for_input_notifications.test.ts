/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  escapeSlackMrkdwnText,
  SERVICENOW_COMMENT_MAX_LENGTH,
  SLACK_SECTION_TEXT_MAX_LENGTH,
} from './hitl_connector_helpers';
import { sendWaitForInputNotifications } from './send_wait_for_input_notifications';

describe('sendWaitForInputNotifications', () => {
  const renderTemplate = (template: string) => template;

  it('escapes a default Slack API section so the step text cannot add a link', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        slack_api: { 'connector-id': 'slack-api-1', channels: ['C0123'] },
      },
      stepMessage: 'See <https://evil.example|click>',
      formUrl: 'https://kibana.example/form',
      kibanaUrl: 'https://kibana.example',
      renderTemplate,
      connectorExecutor: { execute } as never,
      abortController: new AbortController(),
    });

    const blocks = JSON.parse(execute.mock.calls[0][0].input.subActionParams.text).blocks;
    expect(blocks[0].text.text).toBe('See &lt;https:\u2060//evil.example|click&gt;');
    expect(blocks[1].type).toBe('actions');
  });

  it('shortens an escaped Slack API section to 3000 characters and keeps the button', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });
    const stepMessage = 'host <node> & status ok\n'.repeat(100);

    await sendWaitForInputNotifications({
      channels: {
        slack_api: { 'connector-id': 'slack-api-1', channels: ['C0123'] },
      },
      stepMessage,
      formUrl: 'https://kibana.example/form',
      kibanaUrl: 'https://kibana.example',
      renderTemplate,
      connectorExecutor: { execute } as never,
      abortController: new AbortController(),
    });

    const escaped = escapeSlackMrkdwnText(stepMessage);
    const blocks = JSON.parse(execute.mock.calls[0][0].input.subActionParams.text).blocks;
    const section = blocks.find((block: { type: string }) => block.type === 'section');

    expect(escaped.length).toBeGreaterThan(SLACK_SECTION_TEXT_MAX_LENGTH);
    expect(section.text.text.length).toBeLessThanOrEqual(SLACK_SECTION_TEXT_MAX_LENGTH);
    expect(escaped.startsWith(section.text.text)).toBe(true);
    expect(section.text.text).not.toMatch(/&(?!amp;|lt;|gt;)/);
    expect(blocks.some((block: { type: string }) => block.type === 'actions')).toBe(true);
  });

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

  it('posts a Teams channel message with the form link and an optional message override', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        teams: { 'connector-id': 'teams-1', 'team-id': 'team-1', 'channel-id': 'channel-1' },
      },
      stepMessage: 'Please provide input',
      formUrl: 'https://kibana.example/form',
      kibanaUrl: 'https://kibana.example',
      renderTemplate,
      connectorExecutor: { execute } as never,
      abortController: new AbortController(),
    });

    expect(execute).toHaveBeenCalledWith({
      connectorType: 'microsoft-teams',
      connectorNameOrId: 'teams-1',
      input: {
        subAction: 'sendChannelMessage',
        subActionParams: {
          teamId: 'team-1',
          channelId: 'channel-1',
          contentType: 'html',
          content:
            'Please provide input\n\n<br><a href="https://kibana.example/form">Open form</a>',
        },
      },
      abortController: expect.any(AbortController),
    });

    execute.mockClear();
    await sendWaitForInputNotifications({
      channels: {
        teams: {
          'connector-id': 'teams-1',
          'team-id': 'team-1',
          'channel-id': 'channel-1',
          message: 'Respond:\n{{context.hitl.externalFormLink}}',
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

    expect(execute.mock.calls[0][0].input.subActionParams).toEqual(
      expect.objectContaining({
        contentType: 'text',
        content: 'Respond:\nhttps://kibana.example/form',
      })
    );
  });

  it('renders Teams team-id and channel-id before posting', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        teams: {
          'connector-id': 'teams-1',
          'team-id': '{{ inputs.teamId }}',
          'channel-id': '{{ inputs.channelId }}',
        },
      },
      stepMessage: 'Please provide input',
      formUrl: 'https://kibana.example/form',
      kibanaUrl: 'https://kibana.example',
      renderTemplate: (template) =>
        template
          .replace('{{ inputs.teamId }}', 'team-from-input')
          .replace('{{ inputs.channelId }}', '19:channel-from-input@thread.tacv2'),
      connectorExecutor: { execute } as never,
      abortController: new AbortController(),
    });

    expect(execute.mock.calls[0][0].input.subActionParams).toEqual(
      expect.objectContaining({
        teamId: 'team-from-input',
        channelId: '19:channel-from-input@thread.tacv2',
      })
    );
  });

  it('adds a ServiceNow comment with the form link and an optional message override', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        servicenow: { 'connector-id': 'snow-1', table: 'incident', 'sys-id': 'abc123' },
      },
      stepMessage: 'Please provide input',
      formUrl: 'https://kibana.example/form',
      kibanaUrl: 'https://kibana.example',
      renderTemplate,
      connectorExecutor: { execute } as never,
      abortController: new AbortController(),
    });

    expect(execute).toHaveBeenCalledWith({
      connectorType: 'servicenow_search',
      connectorNameOrId: 'snow-1',
      input: {
        subAction: 'addComment',
        subActionParams: {
          table: 'incident',
          sysId: 'abc123',
          comment:
            'Please provide input\n\n[code]<a href="https://kibana.example/form">Open form</a>[/code]',
        },
      },
      abortController: expect.any(AbortController),
    });

    execute.mockClear();
    await sendWaitForInputNotifications({
      channels: {
        servicenow: {
          'connector-id': 'snow-1',
          table: 'incident',
          'sys-id': 'abc123',
          message: 'Ticket form: {{context.hitl.externalFormLink}}',
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

    expect(execute.mock.calls[0][0].input.subActionParams.comment).toBe(
      'Ticket form: https://kibana.example/form'
    );
  });

  it('sends a custom ServiceNow message unchanged, including journal HTML', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        servicenow: {
          'connector-id': 'snow-1',
          table: 'incident',
          'sys-id': 'abc123',
          message:
            'Host <your_input>\n[code]<a href="{{context.hitl.externalFormLink}}">Open the form</a>[/code]',
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

    expect(execute.mock.calls[0][0].input.subActionParams.comment).toBe(
      'Host <your_input>\n[code]<a href="https://kibana.example/form">Open the form</a>[/code]'
    );
  });

  it('throws when a custom ServiceNow message exceeds the connector limit', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await expect(
      sendWaitForInputNotifications({
        channels: {
          servicenow: {
            'connector-id': 'snow-1',
            table: 'incident',
            'sys-id': 'abc123',
            message: 'a'.repeat(SERVICENOW_COMMENT_MAX_LENGTH + 1),
          },
        },
        stepMessage: 'Please provide input',
        formUrl: 'https://kibana.example/form',
        kibanaUrl: 'https://kibana.example',
        renderTemplate,
        connectorExecutor: { execute } as never,
        abortController: new AbortController(),
      })
    ).rejects.toThrow(
      `HITL ServiceNow message is ${
        SERVICENOW_COMMENT_MAX_LENGTH + 1
      } characters and exceeds the ${SERVICENOW_COMMENT_MAX_LENGTH} character connector limit`
    );
    expect(execute).not.toHaveBeenCalled();
  });

  it('escapes ServiceNow step text outside the Open form anchor', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        servicenow: { 'connector-id': 'snow-1', table: 'incident', 'sys-id': 'abc123' },
      },
      stepMessage: 'Ticket for <your_input>',
      formUrl: 'https://kibana.example/form',
      kibanaUrl: 'https://kibana.example',
      renderTemplate,
      connectorExecutor: { execute } as never,
      abortController: new AbortController(),
    });

    expect(execute.mock.calls[0][0].input.subActionParams.comment).toBe(
      'Ticket for \uFF1Cyour_input\uFF1E\n\n[code]<a href="https://kibana.example/form">Open form</a>[/code]'
    );
  });

  it('renders ServiceNow table and sys-id before adding the comment', async () => {
    const execute = jest.fn().mockResolvedValue({ status: 'ok' });

    await sendWaitForInputNotifications({
      channels: {
        servicenow: {
          'connector-id': 'snow-1',
          table: '{{ inputs.table }}',
          'sys-id': '{{ inputs.incident_sys_id }}',
        },
      },
      stepMessage: 'Please provide input',
      formUrl: 'https://kibana.example/form',
      kibanaUrl: 'https://kibana.example',
      renderTemplate: (template) =>
        template
          .replace('{{ inputs.table }}', 'incident')
          .replace('{{ inputs.incident_sys_id }}', '8728d657c377cb10f3f11a2ed40131b1'),
      connectorExecutor: { execute } as never,
      abortController: new AbortController(),
    });

    expect(execute.mock.calls[0][0].input.subActionParams).toEqual(
      expect.objectContaining({
        table: 'incident',
        sysId: '8728d657c377cb10f3f11a2ed40131b1',
      })
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

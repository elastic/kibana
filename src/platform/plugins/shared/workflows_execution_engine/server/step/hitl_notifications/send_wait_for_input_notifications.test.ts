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
});

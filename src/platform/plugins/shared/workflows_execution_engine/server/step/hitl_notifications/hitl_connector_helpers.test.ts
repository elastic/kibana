/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { assertConnectorSucceeded, slackApiChannelTarget } from './hitl_connector_helpers';

describe('assertConnectorSucceeded', () => {
  it('does not throw when status is ok', () => {
    expect(() => assertConnectorSucceeded({ status: 'ok' })).not.toThrow();
  });

  it('prefers serviceMessage over the generic connector message', () => {
    expect(() =>
      assertConnectorSucceeded({
        status: 'error',
        message: 'error posting slack message',
        serviceMessage:
          'One or more provided channels are not included in the allowed channels list',
      })
    ).toThrow('One or more provided channels are not included in the allowed channels list');
  });

  it('falls back to message when serviceMessage is missing', () => {
    expect(() =>
      assertConnectorSucceeded({
        status: 'error',
        message: 'Slack unavailable',
      })
    ).toThrow('Slack unavailable');
  });
});

describe('slackApiChannelTarget', () => {
  it('routes #names to channelNames', () => {
    expect(slackApiChannelTarget('#alerts')).toEqual({ channelNames: ['#alerts'] });
  });

  it('routes other values to channelIds', () => {
    expect(slackApiChannelTarget('C0123456789')).toEqual({ channelIds: ['C0123456789'] });
  });
});

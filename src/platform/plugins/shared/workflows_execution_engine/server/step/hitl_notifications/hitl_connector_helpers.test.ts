/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  assertConnectorSucceeded,
  fitHitlRenderedTextPreservingLink,
  fitHitlTextPreservingSuffix,
  slackApiChannelTarget,
  TEAMS_CONTENT_MAX_LENGTH,
} from './hitl_connector_helpers';

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

describe('fitHitlTextPreservingSuffix', () => {
  const suffix = 'Approve: https://kibana.example/approve\nDecline: https://kibana.example/reject';

  it('shortens the prompt so the links still fit the Teams content limit', () => {
    const content = fitHitlTextPreservingSuffix(
      'a'.repeat(TEAMS_CONTENT_MAX_LENGTH),
      suffix,
      TEAMS_CONTENT_MAX_LENGTH
    );

    expect(content.length).toBe(TEAMS_CONTENT_MAX_LENGTH);
    expect(content.endsWith(suffix)).toBe(true);
  });

  it('throws when the links alone exceed the limit', () => {
    expect(() => fitHitlTextPreservingSuffix('prompt', 'x'.repeat(11), 10)).toThrow(
      'exceed the 10 character connector limit'
    );
  });
});

describe('fitHitlRenderedTextPreservingLink', () => {
  it('keeps the form link when the rendered message is too long', () => {
    const link = 'https://kibana.example/form';
    const text = `${'a'.repeat(TEAMS_CONTENT_MAX_LENGTH)}${link}${'b'.repeat(20)}`;
    const fitted = fitHitlRenderedTextPreservingLink(text, link, TEAMS_CONTENT_MAX_LENGTH);

    expect(fitted.length).toBe(TEAMS_CONTENT_MAX_LENGTH);
    expect(fitted.includes(link)).toBe(true);
  });
});

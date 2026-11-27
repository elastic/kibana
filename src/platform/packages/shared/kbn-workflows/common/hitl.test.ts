/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getHitlChannelConnectorTypeFromPath,
  hasHitlExternalResumeToken,
  HITL_TOKEN_EXPIRES_AT_INPUT_FIELD,
  HITL_TOKEN_HASH_INPUT_FIELD,
  isHitlWaitStepType,
  readHitlExternalResumeToken,
} from './hitl';

describe('getHitlChannelConnectorTypeFromPath', () => {
  it('maps slack, slack_api, email, slack2, teams, servicenow, and http channel connector-id paths', () => {
    expect(getHitlChannelConnectorTypeFromPath(['with', 'channels', 'slack', 'connector-id'])).toBe(
      'slack'
    );
    expect(
      getHitlChannelConnectorTypeFromPath([
        'steps',
        0,
        'with',
        'channels',
        'slack_api',
        'connector-id',
      ])
    ).toBe('slack_api');
    expect(getHitlChannelConnectorTypeFromPath(['with', 'channels', 'email', 'connector-id'])).toBe(
      'email'
    );
    expect(
      getHitlChannelConnectorTypeFromPath(['with', 'channels', 'slack2', 'connector-id'])
    ).toBe('slack2.sendMessage');
    expect(getHitlChannelConnectorTypeFromPath(['with', 'channels', 'teams', 'connector-id'])).toBe(
      'microsoft-teams.sendChannelMessage'
    );
    expect(
      getHitlChannelConnectorTypeFromPath(['with', 'channels', 'servicenow', 'connector-id'])
    ).toBe('servicenow_search.addComment');
    expect(getHitlChannelConnectorTypeFromPath(['with', 'channels', 'http', 'connector-id'])).toBe(
      'http'
    );
  });

  it('returns null outside a HITL channel connector-id path', () => {
    expect(getHitlChannelConnectorTypeFromPath(['steps', 0, 'connector-id'])).toBeNull();
    expect(getHitlChannelConnectorTypeFromPath(['with', 'schema', 'type'])).toBeNull();
    expect(getHitlChannelConnectorTypeFromPath(undefined)).toBeNull();
  });
});

describe('isHitlWaitStepType', () => {
  it('recognizes waitForInput and waitForApproval', () => {
    expect(isHitlWaitStepType('waitForInput')).toBe(true);
    expect(isHitlWaitStepType('waitForApproval')).toBe(true);
    expect(isHitlWaitStepType('slack')).toBe(false);
  });
});

describe('readHitlExternalResumeToken', () => {
  const token = { hash: 'hash', expiresAt: '2099-01-01T00:00:00.000Z' };
  const tokenFields = {
    [HITL_TOKEN_HASH_INPUT_FIELD]: token.hash,
    [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: token.expiresAt,
  };

  it('reads the token from step state', () => {
    expect(
      readHitlExternalResumeToken({ state: { dynamicTimeout: '1h', ...tokenFields } })
    ).toEqual(token);
  });

  it('reads a legacy token stored on step input', () => {
    expect(readHitlExternalResumeToken({ input: { message: 'Respond', ...tokenFields } })).toEqual(
      token
    );
  });

  it('prefers step state when both locations hold a token', () => {
    expect(
      readHitlExternalResumeToken({
        state: tokenFields,
        input: {
          [HITL_TOKEN_HASH_INPUT_FIELD]: 'legacy-hash',
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: '2099-02-01T00:00:00.000Z',
        },
      })
    ).toEqual(token);
  });

  it('detects a live token on one record', () => {
    expect(hasHitlExternalResumeToken(tokenFields)).toBe(true);
    expect(hasHitlExternalResumeToken({ message: 'Respond' })).toBe(false);
    expect(
      hasHitlExternalResumeToken({
        [HITL_TOKEN_HASH_INPUT_FIELD]: null,
        [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
      })
    ).toBe(false);
  });

  it('ignores null token fields left by an invalidation', () => {
    expect(
      readHitlExternalResumeToken({
        state: {
          [HITL_TOKEN_HASH_INPUT_FIELD]: null,
          [HITL_TOKEN_EXPIRES_AT_INPUT_FIELD]: null,
        },
      })
    ).toBeUndefined();
  });
});

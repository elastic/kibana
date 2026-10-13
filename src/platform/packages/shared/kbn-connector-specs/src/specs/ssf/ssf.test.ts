/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import { loggerMock } from '@kbn/logging-mocks';
import type { ActionContext } from '../../connector_spec';
import { SSF } from './ssf';

const eventType = 'https://schemas.openid.net/secevent/caep/event-type/session-revoked';

describe('SSF', () => {
  const client = axios.create();
  const signJwt = jest.fn().mockResolvedValue('signed-set');
  const context: ActionContext = {
    client,
    log: loggerMock.create(),
    getClient: async () => {
      throw new Error('No pooled client is used.');
    },
    signJwt,
    config: {},
  };
  const input = {
    audience: 'https://receiver.example.com',
    events: { [eventType]: { event_timestamp: 1700000000 } },
    subId: { format: 'email', email: 'test@example.com' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('signs the given claims and returns the SET without sending it', async () => {
    const post = jest.spyOn(client, 'post');
    const result = await SSF.actions.signSet.handler(context, { ...input, txn: 'txn-1' });

    expect(signJwt).toHaveBeenCalledWith({
      aud: input.audience,
      jti: expect.any(String),
      iat: expect.any(Number),
      events: input.events,
      sub_id: { format: 'email', email: 'test@example.com' },
      txn: 'txn-1',
    });
    expect(signJwt.mock.calls[0][0]).not.toHaveProperty('iss');
    expect(result).toEqual({ set: 'signed-set', jti: signJwt.mock.calls[0][0].jti });
    expect(post).not.toHaveBeenCalled();
  });

  it('omits txn when it is not given', async () => {
    await SSF.actions.signSet.handler(context, input);
    expect(Object.keys(signJwt.mock.calls[0][0]).sort()).toEqual([
      'aud',
      'events',
      'iat',
      'jti',
      'sub_id',
    ]);
  });

  it('fails when the connector has no signing key', async () => {
    await expect(
      SSF.actions.signSet.handler({ ...context, signJwt: undefined }, input)
    ).rejects.toThrow('The connector has no signing key.');
  });

  it('rejects a missing audience or subject, no events, too many events, and event types that are not URIs', () => {
    const { input: schema } = SSF.actions.signSet;
    const tooMany = Object.fromEntries(
      Array.from({ length: 11 }, (_, index) => [`https://example.com/event/${index}`, {}])
    );
    expect(schema.safeParse(input).success).toBe(true);
    expect(schema.safeParse({ ...input, audience: '' }).success).toBe(false);
    expect(schema.safeParse({ ...input, events: {} }).success).toBe(false);
    expect(schema.safeParse({ ...input, events: tooMany }).success).toBe(false);
    expect(schema.safeParse({ ...input, events: { 'not-a-uri': {} } }).success).toBe(false);
    expect(schema.safeParse({ ...input, subId: undefined }).success).toBe(false);
    expect(schema.safeParse({ ...input, subId: { email: 'test@example.com' } }).success).toBe(
      false
    );
  });

  it('is not exposed as an agent tool', () => {
    expect(SSF.actions.signSet.isTool).toBe(false);
  });
});

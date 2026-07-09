/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { Trello } from './trello';

const mockContext = {
  client: { get: jest.fn(), post: jest.fn() },
  log: {},
} as unknown as ActionContext;

describe('Trello', () => {
  it('should be defined', () => {
    expect(Trello).toBeDefined();
  });

  it('has the expected metadata', () => {
    expect(Trello.metadata.id).toBe('.trello');
    expect(Trello.metadata.minimumLicense).toBe('enterprise');
    expect(Trello.metadata.supportedFeatureIds).toContain('agentBuilder');
  });

  it('uses api_key_query auth with key and token params', () => {
    const authType = Trello.auth?.types[0];
    expect(authType).toEqual(
      expect.objectContaining({
        type: 'api_key_query',
        defaults: { paramNames: ['key', 'token'] },
      })
    );
  });

  it('has a status placeholder action exposed as a tool', () => {
    expect(Trello.actions.status).toBeDefined();
    expect(Trello.actions.status.isTool).toBe(true);
  });

  it('the status action returns a static message without making network calls', async () => {
    const result = await Trello.actions.status.handler(mockContext, {});
    expect(result).toEqual(expect.objectContaining({ ok: true }));
    expect(mockContext.client.get).not.toHaveBeenCalled();
    expect(mockContext.client.post).not.toHaveBeenCalled();
  });
});

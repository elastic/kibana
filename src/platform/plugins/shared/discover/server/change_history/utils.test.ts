/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import { coreMock } from '@kbn/core/server/mocks';
import type { RequestHandlerContext } from '@kbn/core/server';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import { startChangeHistoryClient } from './change_history_service';
import {
  countChangedLineBlocks,
  getSessionSpaceId,
  hasContentChanged,
  recordSessionChange,
} from './utils';

const session = (title: string, namespaces?: string[]) => ({
  id: 'session-id',
  namespaces,
  attributes: { title, description: '', tabs: [] } as unknown as DiscoverSessionAttributes,
  references: [],
});

describe('Discover session change history utils', () => {
  it('reads the space from the saved object namespaces', () => {
    expect(getSessionSpaceId(session('a', ['my-space']))).toBe('my-space');
    expect(getSessionSpaceId(session('a'))).toBe('default');
  });

  it('detects content changes in attributes and references', () => {
    expect(hasContentChanged(session('a'), session('a'))).toBe(false);
    expect(hasContentChanged(session('a'), session('b'))).toBe(true);
    expect(hasContentChanged(session('a'), { ...session('a'), references: [{} as never] })).toBe(
      true
    );
  });

  it('counts changed line blocks', () => {
    expect(countChangedLineBlocks({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(0);
    expect(countChangedLineBlocks({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(1);
    expect(countChangedLineBlocks({ a: 1, b: 2, c: 3 }, { a: 0, b: 2, c: 4 })).toBe(2);
  });

  describe('recordSessionChange', () => {
    const core = coreMock.createRequestHandlerContext();
    const requestContext = {
      resolve: jest.fn().mockResolvedValue({ core }),
    } as unknown as RequestHandlerContext;
    const client = {
      initialize: jest.fn().mockResolvedValue(undefined),
      log: jest.fn().mockResolvedValue(undefined),
      getHistory: jest.fn(),
    };

    beforeEach(() => {
      jest.clearAllMocks();
      client.getHistory.mockResolvedValue({ total: 0, items: [] });
      core.security.authc.getCurrentUser.mockReturnValue({
        username: 'elastic',
        profile_uid: 'uid',
      } as never);
      startChangeHistoryClient(client as never, coreMock.createStart(), loggerMock.create());
    });

    it('never throws when logging fails', async () => {
      client.log.mockRejectedValue(new Error('boom'));

      await expect(
        recordSessionChange({ requestContext, type: 'create', session: session('a') })
      ).resolves.toBeUndefined();
    });

    it('skips updates that did not change the stored content', async () => {
      await recordSessionChange({
        requestContext,
        type: 'update',
        session: session('a'),
        previousSession: session('a'),
      });

      expect(client.log).not.toHaveBeenCalled();
    });
  });
});

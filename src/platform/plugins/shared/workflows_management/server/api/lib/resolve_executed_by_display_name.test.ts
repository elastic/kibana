/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { resolveExecutedByDisplayName } from './resolve_executed_by_display_name';

describe('resolveExecutedByDisplayName', () => {
  const logger = loggingSystemMock.createLogger();
  const bulkGet = jest.fn();
  const userProfile = { bulkGet } as unknown as CoreStart['userProfile'];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the full name when available', async () => {
    bulkGet.mockResolvedValue([{ uid: 'u_1', user: { username: 'jdoe', full_name: 'John Doe' } }]);

    await expect(
      resolveExecutedByDisplayName({ userProfile, executedBy: 'u_1', logger })
    ).resolves.toBe('John Doe');
    expect(bulkGet).toHaveBeenCalledWith({ uids: new Set(['u_1']) });
  });

  it('falls back to the username', async () => {
    bulkGet.mockResolvedValue([{ uid: 'u_1', user: { username: 'jdoe' } }]);

    await expect(
      resolveExecutedByDisplayName({ userProfile, executedBy: 'u_1', logger })
    ).resolves.toBe('jdoe');
  });

  it('returns undefined without looking up when executedBy is empty', async () => {
    await expect(
      resolveExecutedByDisplayName({ userProfile, executedBy: ' ', logger })
    ).resolves.toBeUndefined();
    expect(bulkGet).not.toHaveBeenCalled();
  });

  it('returns undefined when the profile is not found or lookup fails', async () => {
    bulkGet.mockResolvedValueOnce([]);
    await expect(
      resolveExecutedByDisplayName({ userProfile, executedBy: 'u_1', logger })
    ).resolves.toBeUndefined();

    bulkGet.mockRejectedValueOnce(new Error('boom'));
    await expect(
      resolveExecutedByDisplayName({ userProfile, executedBy: 'u_1', logger })
    ).resolves.toBeUndefined();
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { ExecutionAdmissionRegistry } from './execution_admission_registry';

const request = { workflowId: 'wf-1', spaceId: 'default', triggeredBy: 'manual' };

describe('ExecutionAdmissionRegistry', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let registry: ExecutionAdmissionRegistry;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    registry = new ExecutionAdmissionRegistry(logger);
  });

  it('admits when no guard is registered', async () => {
    await expect(registry.check(request)).resolves.toEqual({ admitted: true });
  });

  it('returns the first rejection with the rejecting guard id', async () => {
    const later = jest.fn().mockResolvedValue({ admitted: false, reason: 'later' });
    registry.register('allow', async () => ({ admitted: true }));
    registry.register('budget', async () => ({ admitted: false, reason: 'Budget reached' }));
    registry.register('later', later);

    await expect(registry.check(request)).resolves.toEqual({
      admitted: false,
      guardId: 'budget',
      reason: 'Budget reached',
    });
    expect(later).not.toHaveBeenCalled();
  });

  it('passes the run to every guard', async () => {
    const guard = jest.fn().mockResolvedValue({ admitted: true });
    registry.register('guard', guard);

    await registry.check(request);

    expect(guard).toHaveBeenCalledWith(request);
  });

  it('admits and logs when a guard throws', async () => {
    registry.register('broken', async () => {
      throw new Error('store unavailable');
    });

    await expect(registry.check(request)).resolves.toEqual({ admitted: true });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('store unavailable'));
  });

  it('rejects duplicate guard ids', () => {
    registry.register('guard', async () => ({ admitted: true }));
    expect(() => registry.register('guard', async () => ({ admitted: true }))).toThrow(
      'already registered'
    );
  });

  it('rejects registration after freeze', () => {
    registry.freeze();
    expect(() => registry.register('guard', async () => ({ admitted: true }))).toThrow(
      'after the setup phase'
    );
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockWatchdog = {
  start: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
  runWithLabels: jest.fn((_context, run) => run()),
};
jest.mock('./event_loop_watchdog', () => ({ EventLoopWatchdog: jest.fn(() => mockWatchdog) }));

import { BehaviorSubject } from 'rxjs';
import { mockCoreContext } from '@kbn/core-base-server-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-server-mocks';
import { coreFeatureFlagsMock } from '@kbn/core-feature-flags-server-mocks';
import type { InternalThreadsStart } from '@kbn/core-threads-server-internal';
import {
  EVENT_LOOP_WATCHDOG_FEATURE_FLAG,
  EventLoopWatchdogService,
  resolveDiagnosticDir,
} from './event_loop_watchdog_service';

describe('EventLoopWatchdogService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('toggles the watchdog with the feature flag and labels execution contexts', async () => {
    const service = new EventLoopWatchdogService(mockCoreContext.create());
    const executionContext = executionContextServiceMock.createInternalSetupContract();
    service.setup({ executionContext });
    const wrapper = executionContext.registerContextWrapper.mock.calls[0][0];
    expect(wrapper({ toJSON: () => ({ type: 'a' }) } as never, () => 1)).toBe(1);

    const flag$ = new BehaviorSubject(false);
    const featureFlags = coreFeatureFlagsMock.createStart();
    featureFlags.getBooleanValue$.mockReturnValue(flag$);
    service.start({ featureFlags, threads: {} as InternalThreadsStart });
    expect(featureFlags.getBooleanValue$).toHaveBeenCalledWith(
      EVENT_LOOP_WATCHDOG_FEATURE_FLAG,
      false
    );
    flag$.next(true);
    // toggles are serialised behind the initial (disabled) toggle
    await new Promise(setImmediate);
    expect(mockWatchdog.start).toHaveBeenCalledTimes(1);
    expect(wrapper({ toJSON: () => ({ type: 'a' }) } as never, () => 2)).toBe(2);
    expect(mockWatchdog.runWithLabels).toHaveBeenCalledWith({ type: 'a' }, expect.any(Function));
    flag$.next(false);
    await new Promise(setImmediate);
    expect(mockWatchdog.stop).toHaveBeenCalledTimes(2); // initial disabled value, then the toggle
    await service.stop();
  });
});

describe('resolveDiagnosticDir', () => {
  it('reads --diagnostic-dir from exec arguments or NODE_OPTIONS', () => {
    expect(resolveDiagnosticDir(['--diagnostic-dir=/a'], '')).toBe('/a');
    expect(resolveDiagnosticDir([], '--max-old-space-size=1 --diagnostic-dir=/mnt/diag')).toBe(
      '/mnt/diag'
    );
    expect(resolveDiagnosticDir([], '')).toBeUndefined();
  });
});

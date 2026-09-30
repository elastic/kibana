/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventLoopWatchdogParams } from './event_loop_watchdog';

export const mockWatchdog = {
  start: jest.fn(),
  stop: jest.fn().mockResolvedValue(undefined),
};
export const MockEventLoopWatchdog = jest.fn((_params: EventLoopWatchdogParams) => mockWatchdog);

jest.doMock('./event_loop_watchdog', () => ({ EventLoopWatchdog: MockEventLoopWatchdog }));

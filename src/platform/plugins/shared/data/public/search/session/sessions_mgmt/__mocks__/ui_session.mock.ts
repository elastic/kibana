/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchSessionStatus } from '../../../../../common';
import type { UISession } from '../types';

export function getUiSessionMock(overrides: Partial<UISession> = {}): UISession {
  return {
    id: '1',
    name: 'Test Session',
    appId: 'discover',
    created: '2023-10-01T12:00:00Z',
    expires: null,
    status: SearchSessionStatus.COMPLETE,
    idMapping: {},
    numSearches: 1,
    actions: [],
    reloadUrl: 'some-reload-url',
    restoreUrl: 'some-restore-url',
    initialState: {},
    restoreState: {},
    version: '8.0.0',
    errors: [],
    ...overrides,
  };
}

export function getUiSessionMocks({
  length = 1,
  overrides,
}: {
  length?: number;
  overrides?: (params: { idx: number }) => Partial<UISession>;
} = {}): UISession[] {
  return Array.from({ length }, (_, index) => {
    const override = overrides ? overrides({ idx: index }) : {};
    return getUiSessionMock({ id: `${index + 1}`, name: `Session ${index + 1}`, ...override });
  });
}

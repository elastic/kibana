/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPersistedSearchSessionSavedObjectAttributesMock } from '../../mocks';
import type { SearchSessionSavedObject } from '../types';

export function getSearchSessionSavedObjectMock(
  overrides: Partial<SearchSessionSavedObject> = {}
): SearchSessionSavedObject {
  return {
    id: 'session-1',
    attributes: getPersistedSearchSessionSavedObjectAttributesMock(),
    ...overrides,
  };
}

export function getSearchSessionSavedObjectMocks({
  length = 1,
  overrides,
}: {
  length?: number;
  overrides?: (params: { idx: number }) => Partial<SearchSessionSavedObject>;
}) {
  return Array.from({ length }, (_, index) => {
    const override = overrides ? overrides({ idx: index }) : {};
    return getSearchSessionSavedObjectMock({
      id: `session-${index + 1}`,
      attributes: getPersistedSearchSessionSavedObjectAttributesMock({
        sessionId: `session-${index + 1}`,
        name: `Session ${index + 1}`,
      }),
      ...override,
    });
  });
}

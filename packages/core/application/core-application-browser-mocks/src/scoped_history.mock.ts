/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Location } from 'history';
import type { ScopedHistory } from '@kbn/core-application-browser';

export type ScopedHistoryMock = jest.Mocked<ScopedHistory>;

const createMock = ({
  pathname = '/',
  search = '',
  hash = '',
  key,
  state,
}: Partial<Location> = {}) => {
  const mock: ScopedHistoryMock = {
    block: jest.fn(),
    createHref: jest.fn(),
    createSubHistory: jest.fn(),
    go: jest.fn(),
    goBack: jest.fn(),
    goForward: jest.fn(),
    listen: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    action: 'PUSH',
    length: 1,
    location: {
      pathname,
      search,
      state,
      hash,
      key,
    },
  };

  return mock;
};

export const scopedHistoryMock = {
  create: createMock,
};

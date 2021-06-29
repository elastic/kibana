/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Location } from 'history';
import { ScopedHistory } from './scoped_history';

export type ScopedHistoryMock = jest.Mocked<ScopedHistory>;

const createMock = ({
  pathname = '/',
  search = '',
  hash = '',
  key,
  state,
}: Partial<Location> = {}) => {
  const mock: jest.Mocked<Pick<ScopedHistory, keyof ScopedHistory>> = {
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

  // jest.Mocked still expects private methods and properties to be present, even
  // if not part of the public contract.
  return mock as ScopedHistoryMock;
};

export const scopedHistoryMock = {
  create: createMock,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import type { NewsfeedStorage } from './storage';

const createStorageMock = () => {
  const mock: jest.Mocked<PublicMethodsOf<NewsfeedStorage>> = {
    getLastFetchTime: jest.fn(),
    setLastFetchTime: jest.fn(),
    setFetchedItems: jest.fn(),
    markItemsAsRead: jest.fn(),
    isAnyUnread: jest.fn(),
    isAnyUnread$: jest.fn(),
  };
  return mock as jest.Mocked<NewsfeedStorage>;
};

export const storageMock = {
  create: createStorageMock,
};

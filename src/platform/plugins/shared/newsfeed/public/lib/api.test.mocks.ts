/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { storageMock } from './storage.mock';
import { driverMock } from './driver.mock';
import { NeverFetchNewsfeedApiDriver } from './never_fetch_driver';

export const storageInstanceMock = storageMock.create();
vi.doMock('./storage', () => {
      const mocked = {
      NewsfeedStorage: vi.fn().mockImplementation(() => storageInstanceMock),
    };
      return { ...mocked, default: mocked };
    });

export const driverInstanceMock = driverMock.create();
vi.doMock('./driver', () => {
      const mocked = {
      NewsfeedApiDriver: vi.fn().mockImplementation(() => driverInstanceMock),
    };
      return { ...mocked, default: mocked };
    });

vi.doMock('./never_fetch_driver', () => {
      const mocked = {
      NeverFetchNewsfeedApiDriver: vi.fn(() => new NeverFetchNewsfeedApiDriver()),
    };
      return { ...mocked, default: mocked };
    });

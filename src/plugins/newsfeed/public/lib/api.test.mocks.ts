/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { storageMock } from './storage.mock';
import { driverMock } from './driver.mock';
import { NeverFetchNewsfeedApiDriver } from './never_fetch_driver';

export const storageInstanceMock = storageMock.create();
jest.doMock('./storage', () => ({
  NewsfeedStorage: jest.fn().mockImplementation(() => storageInstanceMock),
}));

export const driverInstanceMock = driverMock.create();
jest.doMock('./driver', () => ({
  NewsfeedApiDriver: jest.fn().mockImplementation(() => driverInstanceMock),
}));

jest.doMock('./never_fetch_driver', () => ({
  NeverFetchNewsfeedApiDriver: jest.fn(() => new NeverFetchNewsfeedApiDriver()),
}));

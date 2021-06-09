/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { storageMock } from './storage.mock';
import { driverMock } from './driver.mock';

export const storageInstanceMock = storageMock.create();
jest.doMock('./storage', () => ({
  NewsfeedStorage: jest.fn().mockImplementation(() => storageInstanceMock),
}));

export const driverInstanceMock = driverMock.create();
jest.doMock('./driver', () => ({
  NewsfeedApiDriver: jest.fn().mockImplementation(() => driverInstanceMock),
}));

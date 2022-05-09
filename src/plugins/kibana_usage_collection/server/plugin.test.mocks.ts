/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloudDetectorMock } from './collectors/cloud/detector/cloud_detector.mock';

const mock = cloudDetectorMock.create();

export const cloudDetailsMock = mock.getCloudDetails;
export const detectCloudServiceMock = mock.detectCloudService;

jest.doMock('./collectors/cloud/detector', () => ({
  CloudDetector: jest.fn().mockImplementation(() => mock),
}));

export const registerEbtCountersMock = jest.fn();

jest.doMock('./ebt_counters', () => ({
  registerEbtCounters: registerEbtCountersMock,
}));

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mocked } from '../mocks_internal';

export const monitorEventLoopDelay = jest.fn().mockImplementation(() => {
  const mockedHistogram = mocked.createHistogram();

  return {
    ...mockedHistogram,
    enable: jest.fn(),
    percentile: jest.fn().mockImplementation((percentile: number) => {
      return (mockedHistogram.percentiles as Record<string, number | undefined>)[`${percentile}`];
    }),
    disable: jest.fn(),
    reset: jest.fn(),
  };
});

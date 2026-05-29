/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const counterAddMocks = new Map<string, jest.Mock>();
const histogramRecordMocks = new Map<string, jest.Mock>();

const getOrCreate = <T>(map: Map<string, T>, key: string, factory: () => T): T => {
  if (!map.has(key)) {
    map.set(key, factory());
  }
  return map.get(key)!;
};

export const mockCreateCounter = jest.fn((name: string) => ({
  add: getOrCreate(counterAddMocks, name, () => jest.fn()),
}));

export const mockCreateHistogram = jest.fn((name: string) => ({
  record: getOrCreate(histogramRecordMocks, name, () => jest.fn()),
}));

export const mockGetMeter = jest.fn(() => ({
  createCounter: mockCreateCounter,
  createHistogram: mockCreateHistogram,
}));

export const getCounterAdd = (name: string): jest.Mock | undefined => counterAddMocks.get(name);
export const getHistogramRecord = (name: string): jest.Mock | undefined =>
  histogramRecordMocks.get(name);

jest.mock('@opentelemetry/api', () => {
  const actual = jest.requireActual('@opentelemetry/api');
  return {
    ...actual,
    metrics: { getMeter: mockGetMeter },
  };
});

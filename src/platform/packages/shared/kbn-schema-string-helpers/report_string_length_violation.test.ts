/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { metrics, ValueType } from '@opentelemetry/api';
import { reportStringLengthViolation } from './report_string_length_violation';

jest.mock('@opentelemetry/api', () => {
  const counter = { add: jest.fn() };
  const meter = { createCounter: jest.fn(() => counter) };
  const provider = { getMeter: jest.fn(() => meter) };
  return {
    ...jest.requireActual('@opentelemetry/api'),
    metrics: { getMeterProvider: jest.fn(() => provider) },
  };
});

const provider = metrics.getMeterProvider();
const meter = provider.getMeter('test');
const counter = meter.createCounter('test');
jest.mocked(provider.getMeter).mockClear();
jest.mocked(meter.createCounter).mockClear();

beforeEach(() => jest.mocked(counter.add).mockReset());

test('creates one shared integer counter with the proposed name', () => {
  reportStringLengthViolation({ helper: 'savedObjectId', library: 'zod', maxLength: 512 });
  reportStringLengthViolation({ helper: 'savedObjectId', library: 'zod', maxLength: 512 });
  expect(provider.getMeter).toHaveBeenCalledTimes(1);
  expect(provider.getMeter).toHaveBeenCalledWith('kibana.schema');
  expect(meter.createCounter).toHaveBeenCalledTimes(1);
  expect(meter.createCounter).toHaveBeenCalledWith('kibana.schema.string_length_violation', {
    description: expect.any(String),
    unit: '{violation}',
    valueType: ValueType.INT,
  });
});

test('reports only static dimensions', () => {
  reportStringLengthViolation({
    helper: 'savedObjectId',
    library: 'zod',
    maxLength: 512,
    label: 'dashboard.panelId',
  });
  expect(counter.add).toHaveBeenCalledWith(1, {
    'schema.helper': 'savedObjectId',
    'schema.library': 'zod',
    'schema.max_length': 512,
    'schema.label': 'dashboard.panelId',
  });
});

test('omits an absent label', () => {
  reportStringLengthViolation({
    helper: 'description',
    library: 'config-schema',
    maxLength: 10000,
  });
  expect(counter.add).toHaveBeenCalledWith(1, {
    'schema.helper': 'description',
    'schema.library': 'config-schema',
    'schema.max_length': 10000,
  });
});

test('does not fail validation if the metric provider throws', () => {
  jest.mocked(counter.add).mockImplementation(() => {
    throw new Error('Exporter failure');
  });
  expect(() =>
    reportStringLengthViolation({ helper: 'savedObjectId', library: 'zod', maxLength: 512 })
  ).not.toThrow();
});

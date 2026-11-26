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
  const histogram = { record: jest.fn() };
  const meter = { createHistogram: jest.fn(() => histogram) };
  const provider = { getMeter: jest.fn(() => meter) };
  return {
    ...jest.requireActual('@opentelemetry/api'),
    metrics: { getMeterProvider: jest.fn(() => provider) },
  };
});

const provider = metrics.getMeterProvider();
const meter = provider.getMeter('test');
const histogram = meter.createHistogram('test');
jest.mocked(provider.getMeter).mockClear();
jest.mocked(meter.createHistogram).mockClear();

// Reporting defers the record until `@opentelemetry/api` has loaded.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeEach(() => jest.mocked(histogram.record).mockReset());

test('creates one shared integer histogram with the proposed name', async () => {
  reportStringLengthViolation({
    helper: 'savedObjectId',
    library: 'zod',
    bound: 'max',
    limit: 512,
    length: 600,
  });
  reportStringLengthViolation({
    helper: 'savedObjectId',
    library: 'zod',
    bound: 'max',
    limit: 512,
    length: 600,
  });
  await flush();
  expect(provider.getMeter).toHaveBeenCalledTimes(1);
  expect(provider.getMeter).toHaveBeenCalledWith('kibana.schema');
  expect(meter.createHistogram).toHaveBeenCalledTimes(1);
  expect(meter.createHistogram).toHaveBeenCalledWith(
    'kibana.schema.string_length_violation.length',
    {
      description: expect.any(String),
      unit: '{code_unit}',
      valueType: ValueType.INT,
      advice: { explicitBucketBoundaries: expect.any(Array) },
    }
  );
});

test('records the actual length with only static dimensions', async () => {
  reportStringLengthViolation({
    helper: 'savedObjectId',
    library: 'zod',
    bound: 'max',
    limit: 512,
    length: 600,
    label: 'dashboard.panelId',
  });
  await flush();
  expect(histogram.record).toHaveBeenCalledWith(600, {
    'schema.helper': 'savedObjectId',
    'schema.library': 'zod',
    'schema.bound': 'max',
    'schema.max_length': 512,
    'schema.label': 'dashboard.panelId',
  });
});

test('records a minimum length violation under its own bound and limit', async () => {
  reportStringLengthViolation({
    helper: 'urlString',
    library: 'config-schema',
    bound: 'min',
    limit: 1,
    length: 0,
    label: 'fleet.outputs.hosts',
  });
  await flush();
  expect(histogram.record).toHaveBeenCalledWith(0, {
    'schema.helper': 'urlString',
    'schema.library': 'config-schema',
    'schema.bound': 'min',
    'schema.min_length': 1,
    'schema.label': 'fleet.outputs.hosts',
  });
});

test('omits an absent label', async () => {
  reportStringLengthViolation({
    helper: 'description',
    library: 'config-schema',
    bound: 'max',
    limit: 10000,
    length: 20000,
  });
  await flush();
  expect(histogram.record).toHaveBeenCalledWith(20000, {
    'schema.helper': 'description',
    'schema.library': 'config-schema',
    'schema.bound': 'max',
    'schema.max_length': 10000,
  });
});

test('does not fail validation if the metric provider throws', async () => {
  jest.mocked(histogram.record).mockImplementation(() => {
    throw new Error('Exporter failure');
  });
  expect(() =>
    reportStringLengthViolation({
      helper: 'savedObjectId',
      library: 'zod',
      bound: 'max',
      limit: 512,
      length: 600,
    })
  ).not.toThrow();
  await expect(flush()).resolves.toBeUndefined();
});

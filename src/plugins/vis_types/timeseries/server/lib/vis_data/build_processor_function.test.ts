/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildProcessorFunction } from './build_processor_function';

describe('buildProcessorFunction(chain, ...args)', () => {
  const req = {};
  const panel = {};
  const series = {};

  test('should call each processor', () => {
    const first = jest.fn(() => (next: any) => (doc: any) => next(doc));
    const second = jest.fn(() => (next: any) => (doc: any) => next(doc));
    buildProcessorFunction([first, second], { req, panel, series });
    expect(first.mock.calls.length).toEqual(1);
    expect(second.mock.calls.length).toEqual(1);
  });

  test('should chain each processor', () => {
    const first = jest.fn(() => (next: any) => (doc: any) => next(doc));
    const second = jest.fn(() => (next: any) => (doc: any) => next(doc));

    buildProcessorFunction([() => first, () => second], { req, panel, series });

    expect(first.mock.calls.length).toEqual(1);
    expect(second.mock.calls.length).toEqual(1);
  });

  test('should next of each processor', () => {
    const first = jest.fn();
    const second = jest.fn();
    const fn = buildProcessorFunction(
      [
        () => (next: any) => (doc: any) => {
          first();
          next(doc);
        },
        () => (next: any) => (doc: any) => {
          second();
          next(doc);
        },
      ],
      {
        req,
        panel,
        series,
      }
    );
    fn({});
    expect(first.mock.calls.length).toEqual(1);
    expect(second.mock.calls.length).toEqual(1);
  });
});

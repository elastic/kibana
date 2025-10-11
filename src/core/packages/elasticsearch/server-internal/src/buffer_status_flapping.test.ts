/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { TestScheduler } from 'rxjs/testing';
import { bufferStatusFlapping } from './buffer_status_flapping';
import type { NodesVersionCompatibility } from './version_check/ensure_es_version';

const compatible: NodesVersionCompatibility = {
  isCompatible: true,
  incompatibleNodes: [],
  warningNodes: [],
  kibanaVersion: '8.0.0',
};

const incompatible: NodesVersionCompatibility = {
  isCompatible: false,
  incompatibleNodes: [{ version: '7.0.0', ip: '127.0.0.1', name: 'node1' }],
  warningNodes: [],
  kibanaVersion: '8.0.0',
  message: 'Incompatible',
};

describe('bufferStatusFlapping', () => {
  const getTestScheduler = () =>
    new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });

  it('should emit compatible statuses immediately', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      const source$ = hot('a-b-c', { a: compatible, b: compatible, c: compatible });
      const expected = ' a-b-c';
      expectObservable(source$.pipe(bufferStatusFlapping())).toBe(expected, {
        a: compatible,
        b: compatible,
        c: compatible,
      });
    });
  });
  it('should not emit incompatible status if below threshold', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      const source$ = hot('a-b-', { a: incompatible, b: incompatible });
      const expected = '---';
      expectObservable(source$.pipe(bufferStatusFlapping())).toBe(expected);
    });
  });

  it('should emit incompatible status only when the threshold is reached', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      const source$ = hot('a-b-c', {
        a: incompatible,
        b: incompatible,
        c: incompatible,
      });
      const expected = '----c';
      expectObservable(source$.pipe(bufferStatusFlapping())).toBe(expected, { c: incompatible });
    });
  });

  it('should reset the counter when a compatible status is received', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      const source$ = hot('a-b-c-d-e-f', {
        a: incompatible,
        b: incompatible,
        c: compatible, // count = 0, emit compatible immediately
        d: incompatible, // count = 1
        e: incompatible, // count = 2
        f: incompatible, // count = 3, emit incompatabile
      });
      const expected = '----c-----f';
      expectObservable(source$.pipe(bufferStatusFlapping())).toBe(expected, {
        c: compatible,
        f: incompatible,
      });
    });
  });

  it('should handle flapping compatibility correctly', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      const source$ = hot('ab-c-d-e', {
        a: incompatible, // count = 1
        b: compatible, // count = 0, emit
        c: incompatible, // count = 1
        d: incompatible, // count = 2
        e: compatible, // count = 0, emit
      });
      const expected = '  -b-----e';
      expectObservable(source$.pipe(bufferStatusFlapping())).toBe(expected, {
        b: compatible,
        e: compatible,
      });
    });
  });

  it('should respect a custom threshold', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      const source$ = hot('a-b-c-d-e', {
        a: incompatible, // count = 1
        b: incompatible, // count = 2
        c: incompatible, // count = 3
        d: incompatible, // count = 4
        e: incompatible, // count = 5, emit
      });
      const expected = '--------e';
      expectObservable(source$.pipe(bufferStatusFlapping(5))).toBe(expected, { e: incompatible });
    });
  });

  it('should emit every incompatible status when threshold is 1', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      const source$ = hot('a-b-c', { a: incompatible, b: incompatible, c: incompatible });
      const expected = ' a-b-c';
      expectObservable(source$.pipe(bufferStatusFlapping(1))).toBe(expected, {
        a: incompatible,
        b: incompatible,
        c: incompatible,
      });
    });
  });

  it('should emit subsequent incompatible statuses after threshold is reached', () => {
    getTestScheduler().run(({ hot, expectObservable }) => {
      const source$ = hot('a-b-c-d', {
        a: incompatible, // count = 1
        b: incompatible, // count = 2
        c: incompatible, // count = 3, emit
        d: incompatible, // count = 4, emit
      });
      const expected = ' ----c-d';
      expectObservable(source$.pipe(bufferStatusFlapping(3))).toBe(expected, {
        c: incompatible,
        d: incompatible,
      });
    });
  });
});

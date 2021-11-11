/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MigrationLog } from '../types';
import {
  createInitialProgress,
  incrementProcessedProgress,
  logProgress,
  setProgressTotal,
} from './progress';

describe('createInitialProgress', () => {
  test('create initial progress', () => {
    expect(createInitialProgress()).toStrictEqual({
      processed: undefined,
      total: undefined,
    });
  });
});

describe('setProgressTotal', () => {
  const previousProgress = {
    processed: undefined,
    total: 10,
  };
  test('should keep the previous total if not provided', () => {
    expect(setProgressTotal(previousProgress)).toStrictEqual(previousProgress);
  });

  test('should keep the previous total is undefined', () => {
    expect(setProgressTotal(previousProgress, undefined)).toStrictEqual(previousProgress);
  });

  test('should overwrite if the previous total is provided', () => {
    expect(setProgressTotal(previousProgress, 20)).toStrictEqual({
      processed: undefined,
      total: 20,
    });
  });
});

describe('logProgress', () => {
  const previousLogs: MigrationLog[] = [];

  test('should not log anything if there is no total', () => {
    const progress = {
      processed: undefined,
      total: undefined,
    };
    expect(logProgress(previousLogs, progress)).toStrictEqual([]);
  });

  test('should not log anything if total is 0', () => {
    const progress = {
      processed: undefined,
      total: 0,
    };
    expect(logProgress(previousLogs, progress)).toStrictEqual([]);
  });

  test('should log the "Starting..." log', () => {
    const progress = {
      processed: undefined,
      total: 10,
    };
    expect(logProgress(previousLogs, progress)).toStrictEqual([
      {
        level: 'info',
        message: 'Starting to process 10 documents.',
      },
    ]);
  });

  test('should log the "Processed..." log', () => {
    const progress = {
      processed: 5,
      total: 10,
    };
    expect(logProgress(previousLogs, progress)).toStrictEqual([
      {
        level: 'info',
        message: 'Processed 5 documents out of 10.',
      },
    ]);
  });
});

describe('incrementProcessedProgress', () => {
  const previousProgress = {
    processed: undefined,
    total: 10,
  };
  test('should not increment if the incrementValue is not defined', () => {
    expect(incrementProcessedProgress(previousProgress)).toStrictEqual({
      processed: 0,
      total: 10,
    });
  });

  test('should not increment if the incrementValue is undefined', () => {
    expect(incrementProcessedProgress(previousProgress, undefined)).toStrictEqual({
      processed: 0,
      total: 10,
    });
  });

  test('should not increment if the incrementValue is not defined (with some processed values)', () => {
    const testPreviousProgress = {
      ...previousProgress,
      processed: 1,
    };
    expect(incrementProcessedProgress(testPreviousProgress, undefined)).toStrictEqual({
      processed: 1,
      total: 10,
    });
  });

  test('should increment if the incrementValue is defined', () => {
    expect(incrementProcessedProgress(previousProgress, 5)).toStrictEqual({
      processed: 5,
      total: 10,
    });
  });

  test('should increment if the incrementValue is defined (with some processed values)', () => {
    const testPreviousProgress = {
      ...previousProgress,
      processed: 5,
    };
    expect(incrementProcessedProgress(testPreviousProgress, 5)).toStrictEqual({
      processed: 10,
      total: 10,
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  DecodedStackTraceResponse,
  decodeStackTraceResponse,
  makeFrameID,
  StackTraceResponse,
} from './stack_traces';

describe('Stack trace response operations', () => {
  test('empty stack trace response', () => {
    const original: StackTraceResponse = {
      total_frames: 0,
      sampling_rate: 1.0,
    };

    const expected: DecodedStackTraceResponse = {
      events: new Map(),
      stackTraces: new Map(),
      stackFrames: new Map(),
      executables: new Map(),
      totalFrames: 0,
      samplingRate: 1.0,
    };

    const decoded = decodeStackTraceResponse(original, false);

    expect(decoded.executables.size).toEqual(expected.executables.size);
    expect(decoded.executables.size).toEqual(0);

    expect(decoded.stackFrames.size).toEqual(expected.stackFrames.size);
    expect(decoded.stackFrames.size).toEqual(0);

    expect(decoded.stackTraces.size).toEqual(expected.stackTraces.size);
    expect(decoded.stackTraces.size).toEqual(0);

    expect(decoded.events.size).toEqual(expected.events.size);
    expect(decoded.events.size).toEqual(0);

    expect(decoded.totalFrames).toEqual(expected.totalFrames);
    expect(decoded.totalFrames).toEqual(0);
  });

  test('stack trace response without undefineds', () => {
    const original: StackTraceResponse = {
      stack_trace_events: {
        a: 1,
      },
      stack_traces: {
        a: {
          file_ids: ['abc', 'def'],
          frame_ids: ['abc123', 'def456'],
          address_or_lines: [123, 456],
          type_ids: [0, 1],
          count: 3,
          annual_co2_tons: 1,
          annual_costs_usd: 1,
        },
      },
      stack_frames: {
        abc: {
          file_name: ['pthread.c'],
          function_name: ['pthread_create'],
          function_offset: [0],
          line_number: [0],
        },
        def: {
          file_name: ['def.c'],
          function_name: ['main', 'inlined'],
          function_offset: [1, 2],
          line_number: [3, 4],
        },
      },
      executables: {
        abc: 'pthread.c',
        def: 'def.c',
      },
      total_frames: 1,
      sampling_rate: 1.0,
    };

    const expected: DecodedStackTraceResponse = {
      events: new Map([['a', 1]]),
      stackTraces: new Map([
        [
          'a',
          {
            FileIDs: ['abc', 'def', 'def'],
            FrameIDs: ['abc123', makeFrameID('def456', 0), makeFrameID('def456', 1)],
            AddressOrLines: [123, 456, 456],
            Types: [0, 1, 1],
            Count: 3,
            selfAnnualCO2Kgs: 1,
            selfAnnualCostUSD: 1,
          },
        ],
      ]),
      stackFrames: new Map([
        [
          'abc',
          {
            FileName: 'pthread.c',
            FunctionName: 'pthread_create',
            FunctionOffset: 0,
            LineNumber: 0,
            Inline: false,
          },
        ],
        [
          makeFrameID('def456', 0),
          {
            FileName: 'def.c',
            FunctionName: 'main',
            FunctionOffset: 1,
            LineNumber: 3,
            Inline: false,
          },
        ],
        [
          makeFrameID('def456', 1),
          {
            FileName: 'def.c',
            FunctionName: 'inlined',
            FunctionOffset: 2,
            LineNumber: 4,
            Inline: false,
          },
        ],
      ]),
      executables: new Map([
        ['abc', { FileName: 'pthread.c' }],
        ['def', { FileName: 'def.c' }],
      ]),
      totalFrames: 1,
      samplingRate: 1.0,
    };

    const decoded = decodeStackTraceResponse(original, false);

    expect(decoded.executables.size).toEqual(expected.executables.size);
    expect(decoded.executables.size).toEqual(2);

    expect(decoded.stackFrames.size).toEqual(expected.stackFrames.size);
    expect(decoded.stackFrames.size).toEqual(3);

    expect(decoded.stackTraces.size).toEqual(expected.stackTraces.size);
    expect(decoded.stackTraces.size).toEqual(1);

    expect(decoded.events.size).toEqual(expected.events.size);
    expect(decoded.events.size).toEqual(1);

    expect(decoded.totalFrames).toEqual(expected.totalFrames);
    expect(decoded.totalFrames).toEqual(1);
  });

  test('stack trace response with undefineds', () => {
    const original: StackTraceResponse = {
      stack_trace_events: {
        a: 1,
      },
      sampling_rate: 1.0,
      stack_traces: {
        a: {
          file_ids: ['abc'],
          frame_ids: ['abc123'],
          address_or_lines: [123],
          type_ids: [0],
          count: 3,
          annual_co2_tons: 1,
          annual_costs_usd: 1,
        },
      },
      stack_frames: {
        abc: {
          file_name: [],
          function_name: ['pthread_create'],
          function_offset: [],
          line_number: [],
        },
      },
      executables: {
        abc: 'pthread.c',
      },
      total_frames: 1,
    };

    const expected: DecodedStackTraceResponse = {
      events: new Map([['a', 1]]),
      stackTraces: new Map([
        [
          'a',
          {
            FileIDs: ['abc'],
            FrameIDs: ['abc123'],
            AddressOrLines: [123],
            Types: [0],
            Count: 3,
            selfAnnualCO2Kgs: 1,
            selfAnnualCostUSD: 1,
          },
        ],
      ]),
      stackFrames: new Map([
        [
          'abc',
          {
            FileName: '',
            FunctionName: 'pthread_create',
            FunctionOffset: 0,
            LineNumber: 0,
            Inline: false,
          },
        ],
      ]),
      executables: new Map([['abc', { FileName: 'pthread.c' }]]),
      totalFrames: 1,
      samplingRate: 1.0,
    };

    const decoded = decodeStackTraceResponse(original, false);

    expect(decoded.executables.size).toEqual(expected.executables.size);
    expect(decoded.executables.size).toEqual(1);

    expect(decoded.stackFrames.size).toEqual(expected.stackFrames.size);
    expect(decoded.stackFrames.size).toEqual(1);

    expect(decoded.stackTraces.size).toEqual(expected.stackTraces.size);
    expect(decoded.stackTraces.size).toEqual(1);

    expect(decoded.events.size).toEqual(expected.events.size);
    expect(decoded.events.size).toEqual(1);

    expect(decoded.totalFrames).toEqual(expected.totalFrames);
    expect(decoded.totalFrames).toEqual(1);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { DurationFormat } from './duration';

describe('Duration Format', () => {
  testCase({
    inputFormat: 'seconds',
    outputFormat: 'humanize',
    outputPrecision: undefined,
    showSuffix: undefined,
    fixtures: [
      {
        input: -60,
        output: 'minus a minute',
      },
      {
        input: 1,
        output: 'a few seconds',
      },
      {
        input: 60,
        output: 'a minute',
      },
      {
        input: 125,
        output: '2 minutes',
      },
    ],
  });

  testCase({
    inputFormat: 'minutes',
    outputFormat: 'humanize',
    outputPrecision: undefined,
    showSuffix: undefined,
    fixtures: [
      {
        input: -60,
        output: 'minus an hour',
      },
      {
        input: 60,
        output: 'an hour',
      },
      {
        input: 125,
        output: '2 hours',
      },
    ],
  });

  testCase({
    inputFormat: 'minutes',
    outputFormat: 'asHours',
    outputPrecision: undefined,
    showSuffix: undefined,
    fixtures: [
      {
        input: -60,
        output: '-1.00',
      },
      {
        input: 60,
        output: '1.00',
      },
      {
        input: 125,
        output: '2.08',
      },
    ],
  });

  testCase({
    inputFormat: 'seconds',
    outputFormat: 'asSeconds',
    outputPrecision: 0,
    showSuffix: undefined,
    fixtures: [
      {
        input: -60,
        output: '-60',
      },
      {
        input: 60,
        output: '60',
      },
      {
        input: 125,
        output: '125',
      },
    ],
  });

  testCase({
    inputFormat: 'seconds',
    outputFormat: 'asSeconds',
    outputPrecision: 2,
    showSuffix: undefined,
    fixtures: [
      {
        input: -60,
        output: '-60.00',
      },
      {
        input: -32.333,
        output: '-32.33',
      },
      {
        input: 60,
        output: '60.00',
      },
      {
        input: 125,
        output: '125.00',
      },
    ],
  });

  testCase({
    inputFormat: 'seconds',
    outputFormat: 'asSeconds',
    outputPrecision: 0,
    showSuffix: true,
    fixtures: [
      {
        input: -60,
        output: '-60 Seconds',
      },
      {
        input: -32.333,
        output: '-32 Seconds',
      },
    ],
  });

  function testCase({
    inputFormat,
    outputFormat,
    outputPrecision,
    showSuffix,
    fixtures,
  }: {
    inputFormat: string;
    outputFormat: string;
    outputPrecision: number | undefined;
    showSuffix: boolean | undefined;
    fixtures: any[];
  }) {
    fixtures.forEach((fixture: Record<string, any>) => {
      const input = fixture.input;
      const output = fixture.output;

      test(`should format ${input} ${inputFormat} through ${outputFormat}${
        outputPrecision ? `, ${outputPrecision} decimals` : ''
      }`, () => {
        const duration = new DurationFormat(
          { inputFormat, outputFormat, outputPrecision, showSuffix },
          jest.fn()
        );
        expect(duration.convert(input)).toBe(output);
      });
    });
  }
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSortingCriteria } from './sorting';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { DatatableColumnType } from '@kbn/expressions-plugin/common';

function getMockFormatter() {
  return { convert: (v: unknown) => `${v as string}` } as FieldFormat;
}

function testSorting({
  input,
  output,
  direction,
  type,
  keepLast,
  reverseOutput = true,
}: {
  input: unknown[];
  output: unknown[];
  direction: 'asc' | 'desc';
  type: DatatableColumnType | 'range' | 'version';
  keepLast?: boolean; // special flag to handle values that should always be last no matter the direction
  reverseOutput?: boolean;
}) {
  const datatable = input.map((v) => ({
    a: v,
  }));
  const sorted = [...output];
  if (direction === 'desc' && reverseOutput) {
    sorted.reverse();
    if (keepLast) {
      // Cycle shift of the first element
      const firstEl = sorted.shift()!;
      sorted.push(firstEl);
    }
  }
  const criteria = getSortingCriteria(type, 'a', getMockFormatter());
  expect(datatable.sort((a, b) => criteria(a, b, direction)).map((row) => row.a)).toEqual(sorted);
}

describe('Data sorting criteria', () => {
  describe('null rows', () => {
    // in these tests it needs to skip the testSorting utility in order to pass null rows
    // mind that [].sort() will never pass `undefined` values to the comparison function
    // so we test it with null values instead
    it('should not crash with null rows with strings', () => {
      const datatable = ['a', 'b', 'c', 'd', '12'];
      const datatableWithNulls = datatable.flatMap((v) => [{ a: v }, null]);
      const criteria = getSortingCriteria('string', 'a', getMockFormatter());
      expect(
        datatableWithNulls
          .sort((a, b) => criteria(a, b, 'asc'))
          .map((row) => (row == null ? row : row.a))
      ).toEqual(['12', 'a', 'b', 'c', 'd', ...Array(datatable.length).fill(null)]);
      expect(
        datatableWithNulls
          .sort((a, b) => criteria(a, b, 'desc'))
          .map((row) => (row == null ? row : row.a))
      ).toEqual(['d', 'c', 'b', 'a', '12', ...Array(datatable.length).fill(null)]);
    });

    it('should not crash with null rows with version', () => {
      const datatable = ['1.21.0', '1.1.0', '1.112.0', '1.0.0', '__other__'];
      const datatableWithNulls = datatable.flatMap((v) => [{ a: v }, null]);
      const criteria = getSortingCriteria('version', 'a', getMockFormatter());
      expect(
        datatableWithNulls
          .sort((a, b) => criteria(a, b, 'asc'))
          .map((row) => (row == null ? row : row.a))
      ).toEqual([
        '1.0.0',
        '1.1.0',
        '1.21.0',
        '1.112.0',
        ...Array(datatable.length).fill(null),
        '__other__',
      ]);
      expect(
        datatableWithNulls
          .sort((a, b) => criteria(a, b, 'desc'))
          .map((row) => (row == null ? row : row.a))
      ).toEqual([
        '1.112.0',
        '1.21.0',
        '1.1.0',
        '1.0.0',
        ...Array(datatable.length).fill(null),
        '__other__',
      ]);
    });
  });
  describe('Date values', () => {
    for (const direction of ['asc', 'desc'] as const) {
      it(`should provide the date criteria for date values (${direction})`, () => {
        const now = Date.now();
        testSorting({
          input: [now, now - 150000, 0],
          output: [0, now - 150000, now],
          direction,
          type: 'date',
        });
      });

      it(`should provide the date criteria for array date values (${direction})`, () => {
        const now = Date.now();
        testSorting({
          input: [now, [0, now], [0], now - 150000],
          output: [[0], [0, now], now - 150000, now],
          direction,
          type: 'date',
        });
      });

      it(`should provide the date criteria for ISO string date values (${direction})`, () => {
        const now = new Date(Date.now()).toISOString();
        const beforeNow = new Date(Date.now() - 150000).toISOString();
        const originString = new Date(0).toISOString();
        testSorting({
          input: [now, beforeNow, originString],
          output: [originString, beforeNow, now],
          direction,
          type: 'date',
        });
      });

      it(`should provide the date criteria for array ISO string date values (${direction})`, () => {
        const now = new Date(Date.now()).toISOString();
        const beforeNow = new Date(Date.now() - 150000).toISOString();
        const originString = new Date(0).toISOString();
        testSorting({
          input: [now, [originString, now], [originString], beforeNow],
          output: [[originString], [originString, now], beforeNow, now],
          direction,
          type: 'date',
        });
      });

      it(`should provide the date criteria for date values (${direction})`, () => {
        const now = Date.now();
        const originString = new Date(0).toISOString();
        testSorting({
          input: [now, now - 150000, originString],
          output: [originString, now - 150000, now],
          direction,
          type: 'date',
        });
      });

      it(`should provide the date criteria for array date values of mixed types (${direction})`, () => {
        const now = Date.now();
        const beforeNow = Date.now() - 150000;
        const originString = new Date(0).toISOString();
        testSorting({
          input: [now, [originString, now], [originString], beforeNow],
          output: [[originString], [originString, now], beforeNow, now],
          direction,
          type: 'date',
        });
      });
    }

    it(`should sort undefined and null to the end`, () => {
      const now = new Date(Date.now()).toISOString();
      const beforeNow = new Date(Date.now() - 150000).toISOString();
      testSorting({
        input: [null, now, 0, undefined, null, beforeNow],
        output: [0, beforeNow, now, null, undefined, null],
        direction: 'asc',
        type: 'date',
        reverseOutput: false,
      });

      testSorting({
        input: [null, now, 0, undefined, null, beforeNow],
        output: [now, beforeNow, 0, null, undefined, null],
        direction: 'desc',
        type: 'date',
        reverseOutput: false,
      });
    });
  });
  describe('Numeric values', () => {
    for (const direction of ['asc', 'desc'] as const) {
      it(`should provide the number criteria of numeric values (${direction})`, () => {
        testSorting({
          input: [7, 6, 5, -Infinity, Infinity],
          output: [-Infinity, 5, 6, 7, Infinity],
          direction,
          type: 'number',
        });
      });

      it(`should provide the number criteria of array numeric values (${direction})`, () => {
        testSorting({
          input: [7, [7, 1], [7, 2], [6], -Infinity, Infinity],
          output: [-Infinity, [6], 7, [7, 1], [7, 2], Infinity],
          direction,
          type: 'number',
        });
      });

      it(`should provide the number criteria of array numeric values (${direction})`, () => {
        testSorting({
          input: [7, [0, 7], [0], 1],
          output: [[0], [0, 7], 1, 7],
          direction,
          type: 'number',
        });
      });
    }

    it(`should sort undefined and null to the end`, () => {
      const now = Date.now();
      testSorting({
        input: [null, now, 0, undefined, null, now - 150000],
        output: [0, now - 150000, now, null, undefined, null],
        direction: 'asc',
        type: 'date',
        reverseOutput: false,
      });

      testSorting({
        input: [null, now, 0, undefined, null, now - 150000],
        output: [now, now - 150000, 0, null, undefined, null],
        direction: 'desc',
        type: 'date',
        reverseOutput: false,
      });
    });

    it(`should sort NaN to the end`, () => {
      const now = Date.now();
      testSorting({
        input: [null, now, 0, undefined, Number.NaN, now - 150000],
        output: [0, now - 150000, now, null, undefined, Number.NaN],
        direction: 'asc',
        type: 'number',
        reverseOutput: false,
      });

      testSorting({
        input: [null, now, 0, undefined, Number.NaN, now - 150000],
        output: [now, now - 150000, 0, null, undefined, Number.NaN],
        direction: 'desc',
        type: 'number',
        reverseOutput: false,
      });
    });
  });

  describe('Version sorting', () => {
    for (const direction of ['asc', 'desc'] as const) {
      it(`should provide the version criteria for terms values (${direction})`, () => {
        testSorting({
          input: ['1.21.0', '1.1.0', '1.112.0', '1.0.0'],
          output: ['1.0.0', '1.1.0', '1.21.0', '1.112.0'],
          direction,
          type: 'version',
        });
      });

      it(`should provide the array version criteria for terms values (${direction})`, () => {
        testSorting({
          input: [['1.21.0'], ['1.1.0', '1.1.1'], ['1.21.1', '1.1.1'], '1.112.0', '1.0.0'],
          output: ['1.0.0', ['1.1.0', '1.1.1'], ['1.21.0'], ['1.21.1', '1.1.1'], '1.112.0'],
          direction,
          type: 'version',
        });
      });
    }

    it('should sort non-version stuff to the end', () => {
      testSorting({
        input: ['1.21.0', undefined, '1.1.0', null, '1.112.0', '__other__', '1.0.0'],
        output: ['1.0.0', '1.1.0', '1.21.0', '1.112.0', null, undefined, '__other__'],
        direction: 'asc',
        type: 'version',
        reverseOutput: false,
      });

      testSorting({
        input: ['1.21.0', undefined, '1.1.0', null, '1.112.0', '__other__', '1.0.0'],
        output: ['1.112.0', '1.21.0', '1.1.0', '1.0.0', null, undefined, '__other__'],
        direction: 'desc',
        type: 'version',
        reverseOutput: false,
      });
    });
  });

  describe('String or anything else as string', () => {
    for (const direction of ['asc', 'desc'] as const) {
      it(`should provide the string criteria for terms values (${direction})`, () => {
        testSorting({
          input: ['a', 'b', 'c', 'd', '12'],
          output: ['12', 'a', 'b', 'c', 'd'],
          direction,
          type: 'string',
        });
      });

      it(`should provide the string criteria for array terms values (${direction})`, () => {
        testSorting({
          input: ['a', 'b', 'c', 'd', '12', ['a', 'b'], ['b', 'c']],
          output: ['12', 'a', ['a', 'b'], 'b', ['b', 'c'], 'c', 'd'],
          direction,
          type: 'string',
        });
      });

      it(`should provide the string criteria for other types of values (${direction})`, () => {
        testSorting({
          input: [true, false, false],
          output: [false, false, true],
          direction,
          type: 'boolean',
        });
      });

      it(`should provide the string criteria for other types of array values (${direction})`, () => {
        testSorting({
          input: [true, false, false, [true, false]],
          output: [false, false, true, [true, false]],
          direction,
          type: 'boolean',
        });
      });
    }

    it('should sort undefined and null to the end', () => {
      testSorting({
        input: ['a', null, 'b', 'c', undefined, 'd', '12'],
        output: ['12', 'a', 'b', 'c', 'd', null, undefined],
        direction: 'asc',
        type: 'string',
        reverseOutput: false,
      });

      testSorting({
        input: ['a', null, 'b', 'c', undefined, 'd', '12'],
        output: ['d', 'c', 'b', 'a', '12', null, undefined],
        direction: 'desc',
        type: 'string',
        reverseOutput: false,
      });

      testSorting({
        input: [true, null, false, undefined, false],
        output: [false, false, true, null, undefined],
        direction: 'asc',
        type: 'boolean',
        reverseOutput: false,
      });
      testSorting({
        input: [true, null, false, undefined, false],
        output: [true, false, false, null, undefined],
        direction: 'desc',
        type: 'boolean',
        reverseOutput: false,
      });
    });
  });

  describe('IP sorting', () => {
    for (const direction of ['asc', 'desc'] as const) {
      it(`should provide the IP criteria for IP values (IPv4 only values) - ${direction}`, () => {
        testSorting({
          input: ['127.0.0.1', '192.168.1.50', '200.100.100.10', '10.0.1.76', '8.8.8.8'],
          output: ['8.8.8.8', '10.0.1.76', '127.0.0.1', '192.168.1.50', '200.100.100.10'],
          direction,
          type: 'ip',
        });
      });

      it(`should provide the IP criteria for IP values (IPv6 only values) - ${direction}`, () => {
        testSorting({
          input: [
            'fc00::123',
            '::1',
            '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
            '2001:db8:1234:0000:0000:0000:0000:0000',
            '2001:db8:1234::', // equivalent to the above
          ],
          output: [
            '::1',
            '2001:db8:1234::',
            '2001:db8:1234:0000:0000:0000:0000:0000',
            '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
            'fc00::123',
          ],
          direction,
          type: 'ip',
        });
      });

      it(`should provide the IP criteria for IP values (mixed values) - ${direction}`, () => {
        // A mix of IPv4, IPv6, IPv4 mapped to IPv6
        testSorting({
          input: [
            'fc00::123',
            '192.168.1.50',
            '::FFFF:192.168.1.50', // equivalent to the above with the IPv6 mapping
            '10.0.1.76',
            '8.8.8.8',
            '::1',
          ],
          output: [
            '::1',
            '8.8.8.8',
            '10.0.1.76',
            '192.168.1.50',
            '::FFFF:192.168.1.50',
            'fc00::123',
          ],
          direction,
          type: 'ip',
        });
      });

      it(`should provide the IP criteria for IP values (mixed values with invalid "Other" field) - ${direction}`, () => {
        testSorting({
          input: ['fc00::123', '192.168.1.50', 'Other', '10.0.1.76', '8.8.8.8', '::1'],
          output: ['::1', '8.8.8.8', '10.0.1.76', '192.168.1.50', 'fc00::123', 'Other'],
          direction,
          type: 'ip',
          keepLast: true,
        });
      });

      it(`should provide the IP criteria for array IP values (mixed values with invalid "Other" field) - ${direction}`, () => {
        testSorting({
          input: [
            'fc00::123',
            '192.168.1.50',
            'Other',
            '10.0.1.76',
            '8.8.8.8',
            '::1',
            ['fc00::123', '192.168.1.50'],
            ['::1', '10.0.1.76'],
          ],
          output: [
            '::1',
            ['::1', '10.0.1.76'],
            '8.8.8.8',
            '10.0.1.76',
            '192.168.1.50',
            'fc00::123',
            ['fc00::123', '192.168.1.50'],
            'Other',
          ],
          direction,
          type: 'ip',
          keepLast: true,
        });
      });
    }

    it('should sort undefined and null to the end', () => {
      testSorting({
        input: [
          'fc00::123',
          '192.168.1.50',
          null,
          undefined,
          'Other',
          '10.0.1.76',
          '8.8.8.8',
          '::1',
        ],
        output: [
          '::1',
          '8.8.8.8',
          '10.0.1.76',
          '192.168.1.50',
          'fc00::123',
          'Other',
          null,
          undefined,
        ],
        direction: 'asc',
        type: 'ip',
        reverseOutput: false,
      });

      testSorting({
        input: [
          'fc00::123',
          '192.168.1.50',
          null,
          undefined,
          'Other',
          '10.0.1.76',
          '8.8.8.8',
          '::1',
        ],
        output: [
          'fc00::123',
          '192.168.1.50',
          '10.0.1.76',
          '8.8.8.8',
          '::1',
          'Other',
          null,
          undefined,
        ],
        direction: 'desc',
        type: 'ip',
        reverseOutput: false,
      });
    });
  });

  describe('Range sorting', () => {
    for (const direction of ['asc', 'desc'] as const) {
      it(`should sort closed ranges - ${direction}`, () => {
        testSorting({
          input: [
            { gte: 1, lt: 5 },
            { gte: 0, lt: 5 },
            { gte: 0, lt: 1 },
          ],
          output: [
            { gte: 0, lt: 1 },
            { gte: 0, lt: 5 },
            { gte: 1, lt: 5 },
          ],
          direction,
          type: 'range',
        });
      });

      it(`should sort open ranges - ${direction}`, () => {
        testSorting({
          input: [{ gte: 1, lt: 5 }, { gte: 0, lt: 5 }, { gte: 0 }],
          output: [{ gte: 0, lt: 5 }, { gte: 0 }, { gte: 1, lt: 5 }],
          direction,
          type: 'range',
        });
      });

      it(`should sort array values for both open and closed ranges - ${direction}`, () => {
        testSorting({
          input: [
            { gte: 1, lt: 5 },
            ,
            [
              { gte: 0, lt: 5 },
              { gte: 1, lt: 5 },
            ],
            [{ gte: 0 }, { gte: 1, lt: 5 }],
            { gte: 0, lt: 5 },
            { gte: 0 },
          ],
          output: [
            { gte: 0, lt: 5 },
            [
              { gte: 0, lt: 5 },
              { gte: 1, lt: 5 },
            ],
            { gte: 0 },
            [{ gte: 0 }, { gte: 1, lt: 5 }],
            { gte: 1, lt: 5 },
          ],
          direction,
          type: 'range',
        });
      });
    }

    it('should sort undefined and null to the end', () => {
      testSorting({
        input: [{ gte: 1, lt: 5 }, undefined, { gte: 0, lt: 5 }, null, { gte: 0 }],
        output: [{ gte: 0, lt: 5 }, { gte: 0 }, { gte: 1, lt: 5 }, undefined, null],
        direction: 'asc',
        type: 'range',
        reverseOutput: false,
      });
      testSorting({
        input: [{ gte: 1, lt: 5 }, undefined, { gte: 0, lt: 5 }, null, { gte: 0 }],
        output: [{ gte: 1, lt: 5 }, { gte: 0 }, { gte: 0, lt: 5 }, undefined, null],
        direction: 'desc',
        type: 'range',
        reverseOutput: false,
      });
    });
  });
});

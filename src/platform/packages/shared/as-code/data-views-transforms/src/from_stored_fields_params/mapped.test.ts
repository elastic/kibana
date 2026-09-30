/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DURATION_FORMAT_DEFAULT_PARAMS, HISTOGRAM_FORMAT_DEFAULT_FORMAT } from '../constants';
import { fromStoredFields } from '../from_stored_fields';
import { expectValidFormat } from './helpers';

describe('fromStoredFields', () => {
  describe('when the format is duration', () => {
    describe('when the params are undefined', () => {
      it('should return the default params', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'duration',
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: {
              type: 'duration',
              params: {
                input_format: DURATION_FORMAT_DEFAULT_PARAMS.inputFormat,
                output_format: DURATION_FORMAT_DEFAULT_PARAMS.outputFormat,
              },
            },
          },
        });
        expectValidFormat(result);
      });
    });

    describe.each([
      {
        inputFormat: 'minutes',
        outputFormat: 'asSeconds',
        outputPrecision: 2,
        showSuffix: true,
        useShortSuffix: false,
        includeSpaceWithSuffix: true,
      },
      {
        inputFormat: 'minutes',
        outputFormat: 'asSeconds',
        outputPrecision: 2,
        showSuffix: true,
        useShortSuffix: false,
        includeSpaceWithSuffix: true,
        foo: 'bar',
      },
    ])('when the params are %s', (params) => {
      it('should return only the duration params', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'duration',
              params,
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: {
              type: 'duration',
              params: {
                input_format: 'minutes',
                output_format: 'as_seconds',
                output_precision: 2,
                show_suffix: true,
                use_short_suffix: false,
                include_space_with_suffix: true,
              },
            },
          },
        });
        expectValidFormat(result);
      });
    });

    describe.each([
      ['humanize', 'humanize'],
      ['humanizePrecise', 'humanize_precise'],
      ['asMilliseconds', 'as_milliseconds'],
      ['asSeconds', 'as_seconds'],
      ['asMinutes', 'as_minutes'],
      ['asHours', 'as_hours'],
      ['asDays', 'as_days'],
      ['asWeeks', 'as_weeks'],
      ['asMonths', 'as_months'],
      ['asYears', 'as_years'],
    ])('when outputFormat is %s', (outputFormat, expected) => {
      it('should snake_case the output format', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'duration',
              params: { outputFormat },
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: {
              type: 'duration',
              params: {
                input_format: DURATION_FORMAT_DEFAULT_PARAMS.inputFormat,
                output_format: expected,
              },
            },
          },
        });
        expectValidFormat(result);
      });
    });

    describe.each([undefined, null])('when optional params are %s', (optional) => {
      it('should omit them', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'duration',
              params: {
                inputFormat: 'minutes',
                outputFormat: 'asSeconds',
                outputPrecision: optional,
                showSuffix: optional,
                useShortSuffix: optional,
                includeSpaceWithSuffix: optional,
              },
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: {
              type: 'duration',
              params: {
                input_format: 'minutes',
                output_format: 'as_seconds',
              },
            },
          },
        });
        expectValidFormat(result);
      });
    });
  });

  describe('when the format is histogram', () => {
    describe('when the params are undefined', () => {
      it('should return the default format', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'histogram',
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: {
              type: 'histogram',
              params: { format: HISTOGRAM_FORMAT_DEFAULT_FORMAT },
            },
          },
        });
        expectValidFormat(result);
      });
    });

    describe.each(['bytes', 'percent', 'number'])('when the inner format is %s', (innerFormat) => {
      describe.each([
        { id: innerFormat, params: { pattern: '0,0.[0]' } },
        { id: innerFormat, params: { pattern: '0,0.[0]', foo: 'bar' }, foo: 'bar' },
      ])('when the params are %s', (params) => {
        it('should return only the format and pattern', () => {
          const result = fromStoredFields(
            {},
            {
              'field-name': {
                id: 'histogram',
                params,
              },
            },
            {}
          );
          expect(result).toEqual({
            'field-name': {
              format: {
                type: 'histogram',
                params: { format: innerFormat, pattern: '0,0.[0]' },
              },
            },
          });
          expectValidFormat(result);
        });
      });
    });

    describe.each([undefined, { pattern: undefined }, { pattern: null }])(
      'when nested params are %s',
      (nestedParams) => {
        it('should return only the format', () => {
          const result = fromStoredFields(
            {},
            {
              'field-name': {
                id: 'histogram',
                params: { id: 'bytes', params: nestedParams },
              },
            },
            {}
          );
          expect(result).toEqual({
            'field-name': {
              format: { type: 'histogram', params: { format: 'bytes' } },
            },
          });
          expectValidFormat(result);
        });
      }
    );

    it('should default the inner format when id is missing', () => {
      const result = fromStoredFields(
        {},
        {
          'field-name': {
            id: 'histogram',
            params: { params: { pattern: '0,0.[0]' } },
          },
        },
        {}
      );
      expect(result).toEqual({
        'field-name': {
          format: {
            type: 'histogram',
            params: { format: HISTOGRAM_FORMAT_DEFAULT_FORMAT, pattern: '0,0.[0]' },
          },
        },
      });
      expectValidFormat(result);
    });
  });

  describe('when the format is static_lookup', () => {
    describe.each([undefined, { lookupEntries: undefined }, { lookupEntries: null }])(
      'when the params are %s',
      (params) => {
        it('should return empty lookup entries', () => {
          const result = fromStoredFields(
            {},
            {
              'field-name': {
                id: 'static_lookup',
                params,
              },
            },
            {}
          );
          expect(result).toEqual({
            'field-name': {
              format: { type: 'static_lookup', params: { lookup_entries: [] } },
            },
          });
          expectValidFormat(result);
        });
      }
    );

    describe.each([
      {
        lookupEntries: [
          { key: 'pending', value: 'Pending' },
          { key: 'done', value: 'Done' },
        ],
        unknownKeyValue: 'Unknown',
      },
      {
        lookupEntries: [
          { key: 'pending', value: 'Pending', foo: 'bar' },
          { key: 'done', value: 'Done' },
        ],
        unknownKeyValue: 'Unknown',
        foo: 'bar',
      },
    ])('when the params are %s', (params) => {
      it('should return only the lookup params', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'static_lookup',
              params,
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: {
              type: 'static_lookup',
              params: {
                lookup_entries: [
                  { key: 'pending', value: 'Pending' },
                  { key: 'done', value: 'Done' },
                ],
                unknown_key_value: 'Unknown',
              },
            },
          },
        });
        expectValidFormat(result);
      });
    });

    describe.each([undefined, null])('when unknownKeyValue is %s', (unknownKeyValue) => {
      it('should omit it', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'static_lookup',
              params: {
                lookupEntries: [{ key: 'pending', value: 'Pending' }],
                unknownKeyValue,
              },
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: {
              type: 'static_lookup',
              params: { lookup_entries: [{ key: 'pending', value: 'Pending' }] },
            },
          },
        });
        expectValidFormat(result);
      });
    });

    it('should drop invalid lookup entries', () => {
      const result = fromStoredFields(
        {},
        {
          'field-name': {
            id: 'static_lookup',
            params: {
              lookupEntries: [
                null,
                'not-an-object',
                { value: 'Done' },
                { key: '', value: 'Empty' },
                { key: 'pending', value: 'Pending' },
              ],
            },
          },
        },
        {}
      );
      expect(result).toEqual({
        'field-name': {
          format: {
            type: 'static_lookup',
            params: { lookup_entries: [{ key: 'pending', value: 'Pending' }] },
          },
        },
      });
      expectValidFormat(result);
    });

    describe.each([undefined, null, ''])('when the lookup value is %s', (value) => {
      it('should coerce it to an empty string', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'static_lookup',
              params: {
                lookupEntries: [{ key: 'pending', value }],
              },
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: {
              type: 'static_lookup',
              params: { lookup_entries: [{ key: 'pending', value: '' }] },
            },
          },
        });
        expectValidFormat(result);
      });
    });

    it('should coerce lookup keys and values to strings', () => {
      const result = fromStoredFields(
        {},
        {
          'field-name': {
            id: 'static_lookup',
            params: {
              lookupEntries: [{ key: 200, value: 404 }],
            },
          },
        },
        {}
      );
      expect(result).toEqual({
        'field-name': {
          format: {
            type: 'static_lookup',
            params: { lookup_entries: [{ key: '200', value: '404' }] },
          },
        },
      });
      expectValidFormat(result);
    });
  });
});

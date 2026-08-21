/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromStoredFields } from './from_stored_fields';
import type { SerializableRecord } from '@kbn/utility-types';

describe('fromStoredRuntimeFields', () => {
  describe('fromStoredFieldFormatParams', () => {
    const getParams = (id: string, params?: SerializableRecord) => {
      const field = fromStoredFields(
        { my_field: { type: 'keyword' } },
        { my_field: params === undefined ? { id } : { id, params } }
      )?.my_field;

      if (!field || !('format' in field) || !field.format || !('params' in field.format)) {
        return undefined;
      }

      return field.format.params;
    };

    describe('when there are no params', () => {
      it('returns undefined', () => {
        const result = getParams('date');
        expect(result).toBeUndefined();
      });
    });

    // Formats without params
    describe.each([
      'boolean',
      'bytes',
      'currency',
      'date_nanos',
      'date',
      'geo_point',
      'ip',
      'number',
      'percent',
      'relative_date',
      'string',
      'truncate',
    ])('when the format is %s', (format) => {
      describe('when there are no params', () => {
        it('returns undefined', () => {
          const result = getParams(format);
          expect(result).toBeUndefined();
        });
      });
    });

    describe.each(['bytes', 'number', 'percent', 'date_nanos', 'date'])(
      'when the format is %s',
      (format) => {
        it('returns the params', () => {
          const result = getParams(format, { pattern: 'some-format' });
          expect(result).toEqual({ pattern: 'some-format' });
        });
      }
    );

    describe('when the format is color', () => {
      describe.each([
        { fieldType: 'string', extraData: { regex: '.*' } },
        { fieldType: 'number', extraData: { range: '1:10' } },
        { fieldType: 'boolean', extraData: { boolean: true } },
      ])('when the field type is $fieldType', ({ fieldType, extraData }) => {
        it('returns the params', () => {
          const result = getParams('color', {
            fieldType,
            colors: [{ text: '#FFFFFF', background: '#000000', ...extraData }],
          });
          expect(result).toEqual({
            field_type: fieldType,
            colors: [{ text: '#FFFFFF', background: '#000000', ...extraData }],
          });
        });
      });
    });

    describe('when the format is string', () => {
      describe.each(['lower', 'upper', 'title', 'short', 'base64', 'urlparam'])(
        'when transform is %s',
        (transform) => {
          it('returns the params', () => {
            const result = getParams('string', { transform });
            expect(result).toEqual({ transform });
          });
        }
      );
    });

    describe('when the format is truncate', () => {
      it('returns the params', () => {
        const result = getParams('truncate', { fieldLength: 128 });
        expect(result).toEqual({ field_length: 128 });
      });
    });

    describe('when the format is geo_point', () => {
      describe.each(['lat_lon_string', 'wkt', 'dms', 'mgrs', 'multi'])(
        'when transform is %s',
        (transform) => {
          it('returns the params', () => {
            const result = getParams('geo_point', { transform });
            expect(result).toEqual({ transform });
          });
        }
      );
    });

    describe('when the format is histogram', () => {
      describe.each(['bytes', 'percent', 'number'])('when inner format is %s', (innerFormat) => {
        it('returns the params', () => {
          const result = getParams('histogram', {
            id: innerFormat,
            params: { pattern: '0,0.[0]' },
          });
          expect(result).toEqual({
            format: innerFormat,
            pattern: '0,0.[0]',
          });
        });
      });
    });

    describe('when the format is static_lookup', () => {
      it('returns the params', () => {
        const result = getParams('static_lookup', {
          lookupEntries: [
            { key: 'pending', value: 'Pending' },
            { key: 'done', value: 'Done' },
          ],
          unknownKeyValue: 'Unknown',
        });
        expect(result).toEqual({
          lookup_entries: [
            { key: 'pending', value: 'Pending' },
            { key: 'done', value: 'Done' },
          ],
          unknown_key_value: 'Unknown',
        });
      });
    });

    describe('when the format is url', () => {
      it('returns the params for link subtype', () => {
        const result = getParams('url', {
          type: 'a',
          urlTemplate: 'https://example.com/{{value}}',
          labelTemplate: '{{value}}',
          openLinkInCurrentTab: true,
        });
        expect(result).toEqual({
          type: 'a',
          url_template: 'https://example.com/{{value}}',
          label_template: '{{value}}',
          open_link_in_current_tab: true,
        });
      });

      it('returns the params for img subtype', () => {
        const result = getParams('url', {
          type: 'img',
          urlTemplate: 'https://example.com/{{value}}.png',
          labelTemplate: '{{value}}',
          width: 200,
          height: 100,
        });
        expect(result).toEqual({
          type: 'img',
          url_template: 'https://example.com/{{value}}.png',
          label_template: '{{value}}',
          width: 200,
          height: 100,
        });
      });

      it('returns the params for audio subtype', () => {
        const result = getParams('url', {
          type: 'audio',
          urlTemplate: 'https://example.com/{{value}}.mp3',
          labelTemplate: '{{value}}',
        });
        expect(result).toEqual({
          type: 'audio',
          url_template: 'https://example.com/{{value}}.mp3',
          label_template: '{{value}}',
        });
      });
    });

    describe('when the format is duration', () => {
      describe.each([
        'picoseconds',
        'nanoseconds',
        'microseconds',
        'milliseconds',
        'seconds',
        'minutes',
        'hours',
        'days',
        'weeks',
        'months',
        'years',
      ])('when the input format is %s', (inputFormat) => {
        describe.each([
          ['humanize', 'humanize'],
          ['humanize_precise', 'humanizePrecise'],
          ['as_milliseconds', 'asMilliseconds'],
          ['as_seconds', 'asSeconds'],
          ['as_minutes', 'asMinutes'],
          ['as_hours', 'asHours'],
          ['as_days', 'asDays'],
          ['as_weeks', 'asWeeks'],
          ['as_months', 'asMonths'],
          ['as_years', 'asYears'],
        ])('when the output format is %s', (outputFormat, outputFormatCamelCase) => {
          it('returns the params', () => {
            const result = getParams('duration', {
              inputFormat,
              outputFormat: outputFormatCamelCase,
              outputPrecision: 2,
              showSuffix: true,
              useShortSuffix: false,
              includeSpaceWithSuffix: true,
            });
            expect(result).toEqual({
              input_format: inputFormat,
              output_format: outputFormat,
              output_precision: 2,
              show_suffix: true,
              use_short_suffix: false,
              include_space_with_suffix: true,
            });
          });
        });
      });
    });
  });
});

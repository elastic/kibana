/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FORMATS_WITHOUT_PARAMS, FORMATS_WITH_PATTERN } from '../constants';
import { fromStoredFields } from '../from_stored_fields';
import { expectValidFormat } from './helpers';

describe('fromStoredFields', () => {
  describe.each(FORMATS_WITHOUT_PARAMS)('when the format is %s', (format) => {
    describe.each([undefined, { foo: 'bar' }])('when the params are %s', (params) => {
      it('should return no params', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: format,
              params,
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': { format: { type: format } },
        });
        expectValidFormat(result);
      });
    });
  });

  describe.each(FORMATS_WITH_PATTERN)('when the format is %s', (format) => {
    describe('when the params are undefined', () => {
      it('should return empty params', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: format,
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': { format: { type: format, params: {} } },
        });
        expectValidFormat(result);
      });
    });

    describe.each([undefined, null])('when the pattern is %s', (pattern) => {
      it('should return empty params', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: format,
              params: { pattern },
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': { format: { type: format, params: {} } },
        });
        expectValidFormat(result);
      });
    });

    describe.each([{ pattern: 'some-format' }, { pattern: 'some-format', foo: 'bar' }])(
      'when the params are %s',
      (params) => {
        it('should return only the pattern', () => {
          const result = fromStoredFields(
            {},
            {
              'field-name': {
                id: format,
                params,
              },
            },
            {}
          );
          expect(result).toEqual({
            'field-name': { format: { type: format, params: { pattern: 'some-format' } } },
          });
          expectValidFormat(result);
        });
      }
    );
  });

  describe('when the format is geo_point', () => {
    describe.each([
      undefined,
      { transform: undefined },
      { transform: null },
      { transform: 'none' },
    ])('when the params are %s', (params) => {
      it('should return no params', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'geo_point',
              params,
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': { format: { type: 'geo_point' } },
        });
        expectValidFormat(result);
      });
    });

    describe.each(['lat_lon_string', 'wkt', 'dms', 'mgrs', 'multi'])(
      'when transform is %s',
      (transform) => {
        describe.each([{ transform }, { transform, foo: 'bar' }])(
          'when the params are %s',
          (params) => {
            it('should return only the transform', () => {
              const result = fromStoredFields(
                {},
                {
                  'field-name': {
                    id: 'geo_point',
                    params,
                  },
                },
                {}
              );
              expect(result).toEqual({
                'field-name': { format: { type: 'geo_point', params: { transform } } },
              });
              expectValidFormat(result);
            });
          }
        );
      }
    );
  });

  describe('when the format is string', () => {
    describe.each([
      undefined,
      { transform: undefined },
      { transform: null },
      { transform: 'false' },
    ])('when the params are %s', (params) => {
      it('should return empty params', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'string',
              params,
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': { format: { type: 'string', params: {} } },
        });
        expectValidFormat(result);
      });
    });

    describe.each(['lower', 'upper', 'title', 'short', 'base64', 'urlparam'])(
      'when transform is %s',
      (transform) => {
        describe.each([{ transform }, { transform, foo: 'bar' }])(
          'when the params are %s',
          (params) => {
            it('should return only the transform', () => {
              const result = fromStoredFields(
                {},
                {
                  'field-name': {
                    id: 'string',
                    params,
                  },
                },
                {}
              );
              expect(result).toEqual({
                'field-name': { format: { type: 'string', params: { transform } } },
              });
              expectValidFormat(result);
            });
          }
        );
      }
    );
  });

  describe('when the format is truncate', () => {
    describe.each([undefined, { fieldLength: undefined }, { fieldLength: null }])(
      'when the params are %s',
      (params) => {
        it('should return empty params', () => {
          const result = fromStoredFields(
            {},
            {
              'field-name': {
                id: 'truncate',
                params,
              },
            },
            {}
          );
          expect(result).toEqual({
            'field-name': { format: { type: 'truncate', params: {} } },
          });
          expectValidFormat(result);
        });
      }
    );

    describe.each([{ fieldLength: 128 }, { fieldLength: 128, foo: 'bar' }])(
      'when the params are %s',
      (params) => {
        it('should return only the field length', () => {
          const result = fromStoredFields(
            {},
            {
              'field-name': {
                id: 'truncate',
                params,
              },
            },
            {}
          );
          expect(result).toEqual({
            'field-name': { format: { type: 'truncate', params: { field_length: 128 } } },
          });
          expectValidFormat(result);
        });
      }
    );
  });

  describe('when the format is unknown', () => {
    describe.each([undefined, {}])('when the params are %s', (params) => {
      it('should return empty params', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'my_custom_format',
              params,
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': { format: { type: 'my_custom_format', params: {} } },
        });
        expectValidFormat(result);
      });
    });

    it('should pass params through', () => {
      const result = fromStoredFields(
        {},
        {
          'field-name': {
            id: 'my_custom_format',
            params: { someOption: 'value', nested: { foo: 'bar' } },
          },
        },
        {}
      );
      expect(result).toEqual({
        'field-name': {
          format: {
            type: 'my_custom_format',
            params: { someOption: 'value', nested: { foo: 'bar' } },
          },
        },
      });
      expectValidFormat(result);
    });

    it('should omit nil param values', () => {
      const result = fromStoredFields(
        {},
        {
          'field-name': {
            id: 'my_custom_format',
            params: { someOption: 'value', other: null, missing: undefined },
          },
        },
        {}
      );
      expect(result).toEqual({
        'field-name': {
          format: { type: 'my_custom_format', params: { someOption: 'value' } },
        },
      });
      expectValidFormat(result);
    });
  });
});

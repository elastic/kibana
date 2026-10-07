/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { COLOR_FORMAT_DEFAULT_PARAMS } from '../constants';
import { fromStoredFields } from '../from_stored_fields';
import { expectValidFormat } from './helpers';

describe('fromStoredFields', () => {
  describe('when the format is color', () => {
    describe('when the params are undefined', () => {
      it('should return the default params', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'color',
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: { type: 'color', params: { field_type: 'string', colors: [] } },
          },
        });
        expectValidFormat(result);
      });
    });

    describe.each([
      {
        fieldType: 'string',
        extraData: { regex: '.*' },
        defaultExtra: { regex: COLOR_FORMAT_DEFAULT_PARAMS.regex },
      },
      {
        fieldType: 'number',
        extraData: { range: '1:10' },
        defaultExtra: { range: COLOR_FORMAT_DEFAULT_PARAMS.range },
      },
      {
        fieldType: 'boolean',
        extraData: { boolean: true },
        defaultExtra: { boolean: COLOR_FORMAT_DEFAULT_PARAMS.boolean },
      },
    ])('when the field type is $fieldType', ({ fieldType, extraData, defaultExtra }) => {
      describe.each([
        {
          fieldType,
          colors: [{ text: '#FFFFFF', background: '#000000', ...extraData }],
        },
        {
          fieldType,
          colors: [{ text: '#FFFFFF', background: '#000000', ...extraData }],
          foo: 'bar',
        },
      ])('when the params are %s', (params) => {
        it('should return only the color params', () => {
          const result = fromStoredFields(
            {},
            {
              'field-name': {
                id: 'color',
                params,
              },
            },
            {}
          );
          expect(result).toEqual({
            'field-name': {
              format: {
                type: 'color',
                params: {
                  field_type: fieldType,
                  colors: [{ text: '#FFFFFF', background: '#000000', ...extraData }],
                },
              },
            },
          });
          expectValidFormat(result);
        });
      });

      it('should fill in default color values', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'color',
              params: { fieldType, colors: [{}] },
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: {
              type: 'color',
              params: {
                field_type: fieldType,
                colors: [
                  {
                    text: COLOR_FORMAT_DEFAULT_PARAMS.text,
                    background: COLOR_FORMAT_DEFAULT_PARAMS.background,
                    ...defaultExtra,
                  },
                ],
              },
            },
          },
        });
        expectValidFormat(result);
      });
    });

    describe('when colors contains null or undefined entries', () => {
      it('should drop them', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'color',
              params: {
                fieldType: 'string',
                colors: [null, { text: '#FFFFFF', background: '#000000', regex: '.*' }, undefined],
              },
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: {
              type: 'color',
              params: {
                field_type: 'string',
                colors: [{ text: '#FFFFFF', background: '#000000', regex: '.*' }],
              },
            },
          },
        });
        expectValidFormat(result);
      });
    });

    describe.each([undefined, 'not-an-array'])('when colors is %s', (colors) => {
      it('should return an empty colors array', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'color',
              params: { fieldType: 'string', colors },
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: { type: 'color', params: { field_type: 'string', colors: [] } },
          },
        });
        expectValidFormat(result);
      });
    });

    it('should treat a non-object color as an empty object', () => {
      const result = fromStoredFields(
        {},
        {
          'field-name': {
            id: 'color',
            params: { fieldType: 'string', colors: ['not-an-object'] },
          },
        },
        {}
      );
      expect(result).toEqual({
        'field-name': {
          format: {
            type: 'color',
            params: {
              field_type: 'string',
              colors: [
                {
                  text: COLOR_FORMAT_DEFAULT_PARAMS.text,
                  background: COLOR_FORMAT_DEFAULT_PARAMS.background,
                  regex: COLOR_FORMAT_DEFAULT_PARAMS.regex,
                },
              ],
            },
          },
        },
      });
      expectValidFormat(result);
    });

    describe.each([
      ['true', true],
      ['false', false],
    ])('when boolean is %s', (boolean, expected) => {
      it('should coerce it to a boolean', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'color',
              params: {
                fieldType: 'boolean',
                colors: [{ text: '#FFFFFF', background: '#000000', boolean }],
              },
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: {
              type: 'color',
              params: {
                field_type: 'boolean',
                colors: [{ text: '#FFFFFF', background: '#000000', boolean: expected }],
              },
            },
          },
        });
        expectValidFormat(result);
      });
    });

    describe.each([undefined, 'invalid'])('when boolean is %s', (boolean) => {
      it('should default to true', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'color',
              params: {
                fieldType: 'boolean',
                colors: [{ text: '#FFFFFF', background: '#000000', boolean }],
              },
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: {
              type: 'color',
              params: {
                field_type: 'boolean',
                colors: [
                  {
                    text: '#FFFFFF',
                    background: '#000000',
                    boolean: COLOR_FORMAT_DEFAULT_PARAMS.boolean,
                  },
                ],
              },
            },
          },
        });
        expectValidFormat(result);
      });
    });
  });
});

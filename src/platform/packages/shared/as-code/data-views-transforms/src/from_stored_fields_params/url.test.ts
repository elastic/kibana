/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { URL_DEFAULT_TYPE } from '../constants';
import { fromStoredFields } from '../from_stored_fields';
import { expectValidFormat } from './helpers';

describe('fromStoredFields', () => {
  describe('when the format is url', () => {
    describe('when the params are undefined', () => {
      it('should return the default type', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'url',
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: { type: 'url', params: { type: URL_DEFAULT_TYPE } },
          },
        });
        expectValidFormat(result);
      });
    });

    describe('when the type is a', () => {
      describe.each([
        {
          type: 'a',
          urlTemplate: 'https://example.com/{{value}}',
          labelTemplate: '{{value}}',
          openLinkInCurrentTab: true,
        },
        {
          type: 'a',
          urlTemplate: 'https://example.com/{{value}}',
          labelTemplate: '{{value}}',
          openLinkInCurrentTab: true,
          width: 200,
          height: 100,
          foo: 'bar',
        },
      ])('when the params are %s', (params) => {
        it('should return only the link params', () => {
          const result = fromStoredFields(
            {},
            {
              'field-name': {
                id: 'url',
                params,
              },
            },
            {}
          );
          expect(result).toEqual({
            'field-name': {
              format: {
                type: 'url',
                params: {
                  type: 'a',
                  url_template: 'https://example.com/{{value}}',
                  label_template: '{{value}}',
                  open_link_in_current_tab: true,
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
                id: 'url',
                params: {
                  type: 'a',
                  urlTemplate: optional,
                  labelTemplate: optional,
                  openLinkInCurrentTab: optional,
                },
              },
            },
            {}
          );
          expect(result).toEqual({
            'field-name': { format: { type: 'url', params: { type: 'a' } } },
          });
          expectValidFormat(result);
        });
      });
    });

    describe('when the type is img', () => {
      describe.each([
        {
          type: 'img',
          urlTemplate: 'https://example.com/{{value}}.png',
          labelTemplate: '{{value}}',
          width: 200,
          height: 100,
        },
        {
          type: 'img',
          urlTemplate: 'https://example.com/{{value}}.png',
          labelTemplate: '{{value}}',
          width: 200,
          height: 100,
          openLinkInCurrentTab: true,
          foo: 'bar',
        },
      ])('when the params are %s', (params) => {
        it('should return only the image params', () => {
          const result = fromStoredFields(
            {},
            {
              'field-name': {
                id: 'url',
                params,
              },
            },
            {}
          );
          expect(result).toEqual({
            'field-name': {
              format: {
                type: 'url',
                params: {
                  type: 'img',
                  url_template: 'https://example.com/{{value}}.png',
                  label_template: '{{value}}',
                  width: 200,
                  height: 100,
                },
              },
            },
          });
          expectValidFormat(result);
        });
      });

      it('should coerce width and height to numbers', () => {
        const result = fromStoredFields(
          {},
          {
            'field-name': {
              id: 'url',
              params: {
                type: 'img',
                width: '200',
                height: '100',
              },
            },
          },
          {}
        );
        expect(result).toEqual({
          'field-name': {
            format: { type: 'url', params: { type: 'img', width: 200, height: 100 } },
          },
        });
        expectValidFormat(result);
      });

      describe.each([undefined, null, '', 'not-a-number'])(
        'when width and height are %s',
        (optional) => {
          it('should omit them', () => {
            const result = fromStoredFields(
              {},
              {
                'field-name': {
                  id: 'url',
                  params: { type: 'img', width: optional, height: optional },
                },
              },
              {}
            );
            expect(result).toEqual({
              'field-name': { format: { type: 'url', params: { type: 'img' } } },
            });
            expectValidFormat(result);
          });
        }
      );
    });

    describe('when the type is audio', () => {
      describe.each([
        {
          type: 'audio',
          urlTemplate: 'https://example.com/{{value}}.mp3',
          labelTemplate: '{{value}}',
        },
        {
          type: 'audio',
          urlTemplate: 'https://example.com/{{value}}.mp3',
          labelTemplate: '{{value}}',
          width: 200,
          height: 100,
          openLinkInCurrentTab: true,
          foo: 'bar',
        },
      ])('when the params are %s', (params) => {
        it('should return only the audio params', () => {
          const result = fromStoredFields(
            {},
            {
              'field-name': {
                id: 'url',
                params,
              },
            },
            {}
          );
          expect(result).toEqual({
            'field-name': {
              format: {
                type: 'url',
                params: {
                  type: 'audio',
                  url_template: 'https://example.com/{{value}}.mp3',
                  label_template: '{{value}}',
                },
              },
            },
          });
          expectValidFormat(result);
        });
      });
    });
  });
});

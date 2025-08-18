/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createStubDataView } from '@kbn/data-views-plugin/common/stubs';
import { getCategorizationField } from './get_categorization_field';
import { getCategorizationDataViewField } from './get_categorization_field';

describe('get_categorization_field utils', () => {
  describe('getCategorizationField', () => {
    it('returns "message" if present', () => {
      const fields = ['foo', 'bar', 'message', 'baz'];
      expect(getCategorizationField(fields)).toBe('message');
    });

    it('returns "error.message" if present and "message" is not', () => {
      const fields = ['foo', 'error.message', 'baz'];
      expect(getCategorizationField(fields)).toBe('error.message');
    });

    it('returns "event.original" if present and others are not', () => {
      const fields = ['event.original', 'foo', 'bar'];
      expect(getCategorizationField(fields)).toBe('event.original');
    });

    it('returns first field if none of the priority fields are present', () => {
      const fields = ['foo', 'bar', 'baz'];
      expect(getCategorizationField(fields)).toBe('foo');
    });

    it('returns first field, skipping meta data fields, if none of the priority fields are present', () => {
      const fields = ['_id', 'foo', 'bar', 'baz'];
      expect(getCategorizationField(fields)).toBe('foo');
    });

    it('returns the first matching field according to priority', () => {
      const fields = ['event.original', 'error.message', 'message'];
      expect(getCategorizationField(fields)).toBe('message');
    });

    it('handles empty array', () => {
      expect(getCategorizationField([])).toBeUndefined();
    });
  });

  describe('getCategorizationDataViewField', () => {
    it('returns messageField as "message" if present', () => {
      const dataView = createStubDataView({
        spec: {
          id: 'test',
          fields: {
            foo: {
              searchable: false,
              aggregatable: false,
              name: 'foo',
              type: 'type',
              esTypes: ['keyword'],
            },
            message: {
              searchable: true,
              aggregatable: true,
              name: 'message',
              type: 'text',
              esTypes: ['text'],
            },
            'error.message': {
              searchable: true,
              aggregatable: true,
              name: 'error.message',
              type: 'text',
              esTypes: ['text'],
            },
          },
        },
      });
      const result = getCategorizationDataViewField(dataView);
      expect(result.messageField?.name).toBe('message');
      expect(result.dataViewFields.map((f) => f.name)).toContain('message');
      expect(result.dataViewFields.length).toBe(2);
    });
    it('returns messageField as "error.message" if "message" is not present', () => {
      const dataView = createStubDataView({
        spec: {
          id: 'test2',
          fields: {
            foo: {
              searchable: false,
              aggregatable: false,
              name: 'foo',
              type: 'type',
              esTypes: ['keyword'],
            },
            'error.message': {
              searchable: true,
              aggregatable: true,
              name: 'error.message',
              type: 'text',
              esTypes: ['text'],
            },
            bar: {
              searchable: true,
              aggregatable: true,
              name: 'bar',
              type: 'text',
              esTypes: ['text'],
            },
          },
        },
      });
      const result = getCategorizationDataViewField(dataView);
      expect(result.messageField?.name).toBe('error.message');
      expect(result.dataViewFields.map((f) => f.name)).toContain('error.message');
      expect(result.dataViewFields.length).toBe(2);
    });

    it('handles empty fields array', () => {
      const dataView = createStubDataView({
        spec: {
          id: 'test6',
          fields: {},
        },
      });
      const result = getCategorizationDataViewField(dataView);
      expect(result.messageField).toBeNull();
      expect(result.dataViewFields.length).toBe(0);
    });

    it('returns the first matching field according to priority', () => {
      const dataView = createStubDataView({
        spec: {
          id: 'test7',
          fields: {
            'event.original': {
              searchable: true,
              aggregatable: true,
              name: 'event.original',
              type: 'text',
              esTypes: ['text'],
            },
            'error.message': {
              searchable: true,
              aggregatable: true,
              name: 'error.message',
              type: 'text',
              esTypes: ['text'],
            },
            message: {
              searchable: true,
              aggregatable: true,
              name: 'message',
              type: 'text',
              esTypes: ['text'],
            },
          },
        },
      });
      const result = getCategorizationDataViewField(dataView);
      expect(result.messageField?.name).toBe('message');
      expect(result.dataViewFields.map((f) => f.name)).toEqual(
        expect.arrayContaining(['message', 'error.message', 'event.original'])
      );
      expect(result.dataViewFields.length).toBe(3);
    });
    it('returns the first field if no priority fields are present', () => {
      const dataView = createStubDataView({
        spec: {
          id: 'test8',
          fields: {
            foo: {
              searchable: true,
              aggregatable: true,
              name: 'foo',
              type: 'text',
              esTypes: ['text'],
            },
            bar: {
              searchable: true,
              aggregatable: true,
              name: 'bar',
              type: 'text',
              esTypes: ['text'],
            },
          },
        },
      });
      const result = getCategorizationDataViewField(dataView);
      expect(result.messageField?.name).toBe('foo');
      expect(result.dataViewFields.map((f) => f.name)).toEqual(
        expect.arrayContaining(['foo', 'bar'])
      );
      expect(result.dataViewFields.length).toBe(2);
    });
    it('returns null messageField if no text fields are present', () => {
      const dataView = createStubDataView({
        spec: {
          id: 'test9',
          fields: {
            foo: {
              searchable: true,
              aggregatable: true,
              name: 'foo',
              type: 'keyword',
              esTypes: ['keyword'],
            },
            bar: {
              searchable: true,
              aggregatable: true,
              name: 'bar',
              type: 'keyword',
              esTypes: ['keyword'],
            },
          },
        },
      });
      const result = getCategorizationDataViewField(dataView);
      expect(result.messageField).toBeNull();
      expect(result.dataViewFields.map((f) => f.name)).toEqual(expect.arrayContaining([]));
      expect(result.dataViewFields.length).toBe(0);
    });
  });
});

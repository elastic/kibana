/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import {
  isESQLColumnSortable,
  isESQLColumnGroupable,
  isESQLFieldGroupable,
} from './esql_fields_utils';
import type { FieldSpec } from '@kbn/data-views-plugin/common';

describe('esql fields helpers', () => {
  describe('isESQLColumnSortable', () => {
    it('returns false for geo fields', () => {
      const geoField = {
        id: 'geo.coordinates',
        name: 'geo.coordinates',
        meta: {
          type: 'geo_point',
          esType: 'geo_point',
        },
        isNull: false,
      } as DatatableColumn;
      expect(isESQLColumnSortable(geoField)).toBeFalsy();
    });

    it('returns false for source fields', () => {
      const sourceField = {
        id: '_source',
        name: '_source',
        meta: {
          type: '_source',
          esType: '_source',
        },
        isNull: false,
      } as DatatableColumn;
      expect(isESQLColumnSortable(sourceField)).toBeFalsy();
    });

    it('returns false for counter fields', () => {
      const tsdbField = {
        id: 'tsbd_counter',
        name: 'tsbd_counter',
        meta: {
          type: 'number',
          esType: 'counter_long',
        },
        isNull: false,
      } as DatatableColumn;
      expect(isESQLColumnSortable(tsdbField)).toBeFalsy();
    });

    it('returns true for everything else', () => {
      const keywordField = {
        id: 'sortable',
        name: 'sortable',
        meta: {
          type: 'string',
          esType: 'keyword',
        },
        isNull: false,
      } as DatatableColumn;
      expect(isESQLColumnSortable(keywordField)).toBeTruthy();
    });
  });

  describe('isESQLColumnGroupable', () => {
    it('returns false for unsupported fields', () => {
      const unsupportedField = {
        id: 'unsupported',
        name: 'unsupported',
        meta: {
          type: 'unknown',
          esType: 'unknown',
        },
        isNull: false,
      } as DatatableColumn;
      expect(isESQLColumnGroupable(unsupportedField)).toBeFalsy();
    });

    it('returns false for counter fields', () => {
      const tsdbField = {
        id: 'tsbd_counter',
        name: 'tsbd_counter',
        meta: {
          type: 'number',
          esType: 'counter_long',
        },
        isNull: false,
      } as DatatableColumn;
      expect(isESQLColumnGroupable(tsdbField)).toBeFalsy();
    });

    it('returns true for everything else', () => {
      const keywordField = {
        id: 'sortable',
        name: 'sortable',
        meta: {
          type: 'string',
          esType: 'keyword',
        },
        isNull: false,
      } as DatatableColumn;
      expect(isESQLColumnGroupable(keywordField)).toBeTruthy();
    });
  });

  describe('isESQLFieldGroupable', () => {
    it('returns false for unsupported fields', () => {
      const fieldSpec: FieldSpec = {
        name: 'unsupported',
        type: 'unknown',
        esTypes: ['unknown'],
        searchable: true,
        aggregatable: false,
        isNull: false,
      };

      expect(isESQLFieldGroupable(fieldSpec)).toBeFalsy();
    });

    it('returns false for counter fields', () => {
      const fieldSpec: FieldSpec = {
        name: 'tsbd_counter',
        type: 'number',
        esTypes: ['long'],
        timeSeriesMetric: 'counter',
        searchable: true,
        aggregatable: false,
        isNull: false,
      };

      expect(isESQLFieldGroupable(fieldSpec)).toBeFalsy();
    });

    it('returns true for everything else', () => {
      const fieldSpec: FieldSpec = {
        name: 'sortable',
        type: 'string',
        esTypes: ['keyword'],
        searchable: true,
        aggregatable: false,
        isNull: false,
      };

      expect(isESQLFieldGroupable(fieldSpec)).toBeTruthy();
    });
  });
});

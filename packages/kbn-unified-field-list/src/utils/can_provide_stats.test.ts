/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  canProvideStatsForField,
  canProvideExamplesForField,
  canProvideStatsForFieldTextBased,
} from './can_provide_stats';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';

describe('can_provide_stats', function () {
  describe('canProvideStatsForField', function () {
    it('works for data view fields', function () {
      expect(canProvideStatsForField(dataView.fields.getByName('extension.keyword')!, false)).toBe(
        true
      );
      expect(canProvideStatsForField(dataView.fields.getByName('non-sortable')!, false)).toBe(true);
      expect(canProvideStatsForField(dataView.fields.getByName('bytes')!, false)).toBe(true);
      expect(canProvideStatsForField(dataView.fields.getByName('ip')!, false)).toBe(true);
      expect(canProvideStatsForField(dataView.fields.getByName('ssl')!, false)).toBe(true);
      expect(canProvideStatsForField(dataView.fields.getByName('@timestamp')!, false)).toBe(true);
      expect(canProvideStatsForField(dataView.fields.getByName('geo.coordinates')!, false)).toBe(
        true
      );
      expect(canProvideStatsForField(dataView.fields.getByName('request_body')!, false)).toBe(
        false
      );
    });

    it('works for text based columns', function () {
      expect(
        canProvideStatsForField(
          { name: 'message', type: 'string', esTypes: ['text'] } as DataViewField,
          true
        )
      ).toBe(true);
      expect(
        canProvideStatsForField(
          { name: 'message', type: 'string', esTypes: ['keyword'] } as DataViewField,
          true
        )
      ).toBe(true);
      expect(
        canProvideStatsForField({ name: 'message', type: 'number' } as DataViewField, true)
      ).toBe(true);
      expect(
        canProvideStatsForField({ name: 'message', type: 'boolean' } as DataViewField, true)
      ).toBe(true);
      expect(canProvideStatsForField({ name: 'message', type: 'ip' } as DataViewField, true)).toBe(
        true
      );
      expect(
        canProvideStatsForField({ name: 'message', type: 'geo_point' } as DataViewField, true)
      ).toBe(true);
      expect(
        canProvideStatsForField(
          { name: '_id', type: 'string', esTypes: ['keyword'] } as DataViewField,
          true
        )
      ).toBe(true);

      expect(
        canProvideStatsForField({ name: 'message', type: 'date' } as DataViewField, true)
      ).toBe(false);
    });
  });

  describe('canProvideExamplesForField', function () {
    it('works for data view fields', function () {
      expect(canProvideExamplesForField(dataView.fields.getByName('non-sortable')!, false)).toBe(
        true
      );
      expect(canProvideExamplesForField(dataView.fields.getByName('geo.coordinates')!, false)).toBe(
        true
      );
    });

    it('works for text based columns', function () {
      expect(
        canProvideExamplesForField(
          { name: 'message', type: 'string', esTypes: ['text'] } as DataViewField,
          true
        )
      ).toBe(true);
      expect(
        canProvideExamplesForField(
          { name: 'message', type: 'string', esTypes: ['keyword'] } as DataViewField,
          true
        )
      ).toBe(false);
      expect(
        canProvideExamplesForField({ name: 'message', type: 'number' } as DataViewField, true)
      ).toBe(false);
      expect(
        canProvideExamplesForField({ name: 'message', type: 'boolean' } as DataViewField, true)
      ).toBe(false);
      expect(
        canProvideExamplesForField({ name: 'message', type: 'ip' } as DataViewField, true)
      ).toBe(false);
      expect(
        canProvideExamplesForField({ name: 'message', type: 'geo_point' } as DataViewField, true)
      ).toBe(true);
      expect(
        canProvideExamplesForField({ name: 'message', type: 'date' } as DataViewField, true)
      ).toBe(false);
      expect(
        canProvideStatsForField(
          { name: '_id', type: 'string', esTypes: ['keyword'] } as DataViewField,
          true
        )
      ).toBe(true);
    });

    describe('canProvideStatsForFieldTextBased', function () {
      it('works for text based columns', function () {
        expect(
          canProvideStatsForFieldTextBased({
            name: 'message',
            type: 'string',
            esTypes: ['text'],
          } as DataViewField)
        ).toBe(true);
        expect(
          canProvideStatsForFieldTextBased({
            name: 'message',
            type: 'string',
            esTypes: ['keyword'],
          } as DataViewField)
        ).toBe(true);
        expect(
          canProvideStatsForFieldTextBased({ name: 'message', type: 'number' } as DataViewField)
        ).toBe(true);
        expect(
          canProvideStatsForFieldTextBased({ name: 'message', type: 'boolean' } as DataViewField)
        ).toBe(true);
        expect(
          canProvideStatsForFieldTextBased({ name: 'message', type: 'ip' } as DataViewField)
        ).toBe(true);
        expect(
          canProvideStatsForFieldTextBased({ name: 'message', type: 'ip_range' } as DataViewField)
        ).toBe(false);
        expect(
          canProvideStatsForFieldTextBased({ name: 'message', type: 'geo_point' } as DataViewField)
        ).toBe(true);
        expect(
          canProvideStatsForFieldTextBased({ name: 'message', type: 'date' } as DataViewField)
        ).toBe(false);
        expect(
          canProvideStatsForFieldTextBased({
            name: '_id',
            type: 'string',
            esTypes: ['keyword'],
          } as DataViewField)
        ).toBe(true);
      });
    });
  });
});

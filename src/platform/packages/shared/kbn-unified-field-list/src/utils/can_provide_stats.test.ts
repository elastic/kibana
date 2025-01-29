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
  canProvideStatsForEsqlField,
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

    it('should not work for ES|QL columns', function () {
      expect(
        canProvideStatsForField(
          { name: 'message', type: 'string', esTypes: ['text'] } as DataViewField,
          true
        )
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

    it('should not work for ES|QL columns', function () {
      expect(
        canProvideExamplesForField(
          { name: 'message', type: 'string', esTypes: ['text'] } as DataViewField,
          true
        )
      ).toBe(false);
    });

    describe('canProvideStatsForEsqlField', function () {
      it('should not work for ES|QL columns', function () {
        expect(
          canProvideStatsForEsqlField({
            name: 'message',
            type: 'string',
            esTypes: ['text'],
          } as DataViewField)
        ).toBe(false);
      });
    });
  });
});

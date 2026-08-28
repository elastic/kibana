/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AS_CODE_DATA_VIEW_REFERENCE_TYPE,
  AS_CODE_ESQL_DATA_SOURCE_TYPE,
} from '@kbn/as-code-data-views-schema';
import { mockGetDrilldownsSchema } from '@kbn/embeddable-plugin/server/mocks';
import { getDiscoverSessionEmbeddableSchema } from './schema_override';

const jsonViewFields = {
  documents_display_mode: 'json',
  json_mode_settings: { hide_nulls: true, wrap_lines: false },
};

const classicTab = {
  data_source: {
    type: AS_CODE_DATA_VIEW_REFERENCE_TYPE,
    ref_id: 'logs-data-view',
  },
};

const esqlTab = {
  data_source: {
    type: AS_CODE_ESQL_DATA_SOURCE_TYPE,
    query: 'FROM logs-* | LIMIT 10',
  },
};

describe('getDiscoverSessionEmbeddableSchema', () => {
  describe('when the JSON view flag is off', () => {
    const schema = getDiscoverSessionEmbeddableSchema({ dataTableJsonView: false })(
      mockGetDrilldownsSchema
    );

    it('rejects JSON view fields on a by-value classic tab', () => {
      expect(() =>
        schema.parse({
          tabs: [{ ...classicTab, ...jsonViewFields }],
        })
      ).toThrow(/Unrecognized key/);
    });

    it('rejects JSON view fields on a by-value ES|QL tab', () => {
      expect(() =>
        schema.parse({
          tabs: [{ ...esqlTab, ...jsonViewFields }],
        })
      ).toThrow(/Unrecognized key/);
    });

    it('rejects JSON view fields on by-reference overrides', () => {
      expect(() =>
        schema.parse({
          ref_id: 'session-id',
          overrides: jsonViewFields,
        })
      ).toThrow(/Unrecognized key/);
    });

    it('accepts by-value and by-reference payloads without JSON view fields', () => {
      expect(schema.parse({ tabs: [classicTab] })).toEqual(
        expect.objectContaining({ tabs: [expect.objectContaining(classicTab)] })
      );
      expect(schema.parse({ ref_id: 'session-id' })).toEqual(
        expect.objectContaining({ ref_id: 'session-id' })
      );
    });
  });

  describe('when the JSON view flag is on', () => {
    const schema = getDiscoverSessionEmbeddableSchema({ dataTableJsonView: true })(
      mockGetDrilldownsSchema
    );

    it('accepts JSON view fields on tabs and by-reference overrides', () => {
      expect(
        schema.parse({
          tabs: [{ ...classicTab, ...jsonViewFields }],
        })
      ).toEqual(
        expect.objectContaining({
          tabs: [expect.objectContaining(jsonViewFields)],
        })
      );
      expect(
        schema.parse({
          ref_id: 'session-id',
          overrides: jsonViewFields,
        })
      ).toEqual(
        expect.objectContaining({
          overrides: expect.objectContaining(jsonViewFields),
        })
      );
    });
  });
});

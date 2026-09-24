/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromStoredDataView, toStoredDataView } from '@kbn/as-code-data-views-transforms';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { ESQL_TYPE } from '@kbn/data-view-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { cloneDeep } from 'lodash';
import {
  generateInlineDataViewId,
  getDataViewSpecKey,
  getInlineDataView,
} from './inline_data_view';
import { inlineDataViewIdCases, inlineSpecWithRuntimeField } from './inline_data_view.fixtures';

const toApiRoundTripSpec = (spec: DataViewSpec) => {
  const storedSpec = toStoredDataView(fromStoredDataView(spec));
  if (typeof storedSpec === 'string') {
    throw new Error('Expected an inline Data View spec');
  }

  return storedSpec;
};

describe('generateInlineDataViewId', () => {
  it.each(inlineDataViewIdCases)(
    'keeps the expected ID for %s',
    (_description, spec, expectedId) => {
      const input = cloneDeep(spec);

      expect(generateInlineDataViewId(input)).toBe(expectedId);
      expect(input).toEqual(spec);
    }
  );

  it('returns the same ID when called again with a copy of the spec', () => {
    const id = generateInlineDataViewId(inlineSpecWithRuntimeField);

    expect(generateInlineDataViewId(cloneDeep(inlineSpecWithRuntimeField))).toBe(id);
  });

  it('handles a spec with only a title, with or without explicit defaults', () => {
    const spec: DataViewSpec = { title: 'logs-*' };
    const id = generateInlineDataViewId(spec);

    expect(id).toMatch(/^discover-inline-[a-f0-9]{64}$/);
    expect(generateInlineDataViewId({ ...spec, name: 'logs-*', allowHidden: false })).toBe(id);
  });

  it.each(['', 'logs-*'])('treats the name "%s" like an omitted name', (name) => {
    expect(generateInlineDataViewId({ ...inlineSpecWithRuntimeField, name })).toBe(
      generateInlineDataViewId(inlineSpecWithRuntimeField)
    );
  });

  it.each<[string, Partial<DataViewSpec>]>([
    ['pattern', { title: 'other-logs-*' }],
    ['time field', { timeFieldName: 'event.created' }],
    ['name', { name: 'Other logs' }],
    ['hidden indices', { allowHidden: true }],
    ['field filters', { sourceFilters: [{ value: 'secret.*' }] }],
    ['field label', { fieldAttrs: { bytes: { customLabel: 'Bytes transferred' } } }],
    ['field format', { fieldFormats: { bytes: { id: 'number', params: { pattern: '0.00' } } } }],
    [
      'runtime script',
      {
        runtimeFieldMap: {
          bytes_runtime: { type: 'long', script: { source: 'emit(doc["bytes"].value * 2)' } },
        },
      },
    ],
  ])('changes the ID when the %s changes', (_field, changes) => {
    expect(generateInlineDataViewId({ ...inlineSpecWithRuntimeField, ...changes })).not.toBe(
      generateInlineDataViewId(inlineSpecWithRuntimeField)
    );
  });
});

describe('inline Data View identity across representations', () => {
  it.each(inlineDataViewIdCases)(
    'keeps the expected ID for %s after an as-code round trip',
    (_description, spec, expectedId) => {
      const apiSpec = toApiRoundTripSpec(spec);

      expect(apiSpec).not.toHaveProperty('id');
      expect(generateInlineDataViewId(apiSpec)).toBe(expectedId);
    }
  );

  it.each(inlineDataViewIdCases)(
    'keeps the expected ID for %s after Data View serialization',
    (_description, spec, expectedId) => {
      const dataView = new DataView({ spec: cloneDeep(spec), fieldFormats: fieldFormatsMock });

      expect(generateInlineDataViewId(dataView.toMinimalSpec())).toBe(expectedId);
    }
  );
});

describe('getDataViewSpecKey', () => {
  it('ignores the order of properties, including those inside runtime fields', () => {
    const reorderedSpec: DataViewSpec = {
      runtimeFieldMap: {
        bytes_runtime: { script: { source: 'emit(doc["bytes"].value)' }, type: 'long' },
      },
      timeFieldName: '@timestamp',
      title: 'logs-*',
    };

    expect(getDataViewSpecKey(reorderedSpec)).toBe(getDataViewSpecKey(inlineSpecWithRuntimeField));
  });

  it.each<[string, Partial<DataViewSpec>]>([
    ['local metadata', { id: 'local-id', version: 'local-version', managed: true }],
    [
      'explicit default values',
      {
        name: 'logs-*',
        allowHidden: false,
        sourceFilters: [],
        fieldFormats: {},
        fieldAttrs: {},
      },
    ],
    ['field popularity', { fieldAttrs: { bytes: { count: 3 } } }],
    ['empty field settings', { fieldAttrs: { bytes: {} } }],
  ])('ignores %s', (_description, changes) => {
    expect(getDataViewSpecKey({ ...inlineSpecWithRuntimeField, ...changes })).toBe(
      getDataViewSpecKey(inlineSpecWithRuntimeField)
    );
  });
});

describe('getInlineDataView', () => {
  it('returns a classic inline spec', () => {
    expect(getInlineDataView({ index: inlineSpecWithRuntimeField })).toBe(
      inlineSpecWithRuntimeField
    );
  });

  it.each<[string, SerializedSearchSourceFields | undefined]>([
    ['a missing search source', undefined],
    ['a referenced Data View', { index: 'saved-data-view' }],
    ['a spec without an index pattern', { index: { name: 'Unnamed' } }],
    ['an ES|QL query', { index: { title: 'logs-*' }, query: { esql: 'FROM logs-*' } }],
    ['an ES|QL Data View', { index: { title: 'logs-*', type: ESQL_TYPE } }],
    [
      'a managed profile view',
      {
        index: {
          id: 'discover-observability-solution-all-logs',
          title: 'logs-*',
          managed: true,
        },
      },
    ],
  ])('ignores %s', (_description, searchSource) => {
    expect(getInlineDataView(searchSource)).toBeUndefined();
  });
});

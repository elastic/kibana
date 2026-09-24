/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_TYPE } from '@kbn/data-view-utils';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { generateInlineDataViewId } from '../../common/session/inline_data_view';
import { inlineDataViewIdCases } from '../../common/session/inline_data_view.fixtures';
import { createInlineDataViewService } from './inline_data_view_service';

const inlineSpec: DataViewSpec = { title: 'logs-*', timeFieldName: '@timestamp' };
const editedSpec: DataViewSpec = { ...inlineSpec, title: 'other-logs-*' };
const inlineDataViewId = generateInlineDataViewId(inlineSpec);
const editedDataViewId = generateInlineDataViewId(editedSpec);

const createDataView = (spec: DataViewSpec) =>
  new DataView({ spec, fieldFormats: fieldFormatsMock });

// Mirrors DataViewsService.create: a cached ID returns the cached instance and ignores the spec.
const setup = () => {
  const cache = new Map<string, DataView>();
  const create = jest.fn(async (spec: DataViewSpec) => {
    const cachedDataView = spec.id ? cache.get(spec.id) : undefined;
    if (cachedDataView) {
      return cachedDataView;
    }

    const id = spec.id ?? 'generated-id';
    const dataView = createDataView({ ...spec, id });
    cache.set(id, dataView);

    return dataView;
  });

  return { cache, create, service: createInlineDataViewService({ dataViews: { create } }) };
};

describe('createInlineDataViewService', () => {
  describe('resolve', () => {
    it('derives the ID of inline specs and shares their instance', async () => {
      const { create, service } = setup();

      const first = await service.resolve({ ...inlineSpec, id: 'first-id' });
      const second = await service.resolve({ ...inlineSpec, id: 'second-id' });

      expect(first.id).toBe(inlineDataViewId);
      expect(second).toBe(first);
      expect(create).toHaveBeenNthCalledWith(1, { ...inlineSpec, id: inlineDataViewId });
    });

    it.each<[string, DataViewSpec]>([
      ['ES|QL', { ...inlineSpec, id: 'esql-id', type: ESQL_TYPE }],
      ['managed', { ...inlineSpec, id: 'profile-id', managed: true }],
      ['untitled', { id: 'untitled-id' }],
    ])('creates %s specs as given', async (_description, spec) => {
      const { create, service } = setup();

      const dataView = await service.resolve(spec);

      expect(create).toHaveBeenCalledWith(spec);
      expect(dataView.id).toBe(spec.id);
    });
  });

  describe('finalize', () => {
    it('gives an edited spec its own ID and keeps the instance of the previous spec', async () => {
      const { cache, create, service } = setup();
      const original = await service.resolve(inlineSpec);
      const draft = createDataView({ ...editedSpec, id: 'draft-id' });

      const finalized = await service.finalize(draft);

      expect(finalized.id).toBe(editedDataViewId);
      expect(create).toHaveBeenLastCalledWith({ ...draft.toSpec(), id: editedDataViewId }, true);
      expect(cache.get(inlineDataViewId)).toBe(original);
      expect(original.getIndexPattern()).toBe(inlineSpec.title);
    });

    it('returns the shared instance when the final spec is unchanged', async () => {
      const { service } = setup();
      const original = await service.resolve(inlineSpec);
      original.setFieldCount('@timestamp', 3);
      const draft = createDataView({ ...inlineSpec, id: 'draft-id' });

      const finalized = await service.finalize(draft);

      expect(finalized).toBe(original);
      expect(finalized.getFieldAttrs().get('@timestamp')?.count).toBe(3);
    });

    it('returns a view that already has its derived ID without creating it again', async () => {
      const { create, service } = setup();
      const dataView = createDataView({ ...inlineSpec, id: inlineDataViewId });

      await expect(service.finalize(dataView)).resolves.toBe(dataView);
      expect(create).not.toHaveBeenCalled();
    });

    it.each<[string, DataViewSpec]>([
      ['persisted', { ...inlineSpec, id: 'saved-id', version: 'WzEsMV0=' }],
      ['ES|QL', { ...inlineSpec, id: 'esql-id', type: ESQL_TYPE }],
      ['managed', { ...inlineSpec, id: 'profile-id', managed: true }],
    ])('returns %s views unchanged', async (_description, spec) => {
      const { create, service } = setup();
      const dataView = createDataView(spec);

      await expect(service.finalize(dataView)).resolves.toBe(dataView);
      expect(create).not.toHaveBeenCalled();
    });
  });

  it.each(inlineDataViewIdCases)(
    'derives the literal ID of %s through resolve and finalize',
    async (_description, spec, expectedId) => {
      const resolved = await setup().service.resolve(spec);
      const finalized = await setup().service.finalize(createDataView({ ...spec, id: 'draft-id' }));

      expect(resolved.id).toBe(expectedId);
      expect(finalized.id).toBe(expectedId);
    }
  );
});

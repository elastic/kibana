/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQL_TYPE } from '@kbn/data-view-utils';
import { waitFor } from '@testing-library/react';
import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { DataView } from '@kbn/data-views-plugin/common';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { generateInlineDataViewId } from '../../common/session/inline_data_view';
import { inlineDataViewIdCases } from '../../common/session/inline_data_view.fixtures';
import { createDataViewsCacheMock } from '../__mocks__/data_views';
import { createInlineDataViewService } from './inline_data_view_service';

const inlineSpec: DataViewSpec = { title: 'logs-*', timeFieldName: '@timestamp' };
const editedSpec: DataViewSpec = { ...inlineSpec, title: 'other-logs-*' };
const inlineDataViewId = generateInlineDataViewId(inlineSpec);
const editedDataViewId = generateInlineDataViewId(editedSpec);
const timestampFields: DataViewSpec['fields'] = {
  '@timestamp': { name: '@timestamp', type: 'date', searchable: true, aggregatable: true },
};

const createDataView = (spec: DataViewSpec) =>
  new DataView({ spec, fieldFormats: fieldFormatsMock });

const setup = () => {
  const { cache, create, clearInstanceCache } = createDataViewsCacheMock();

  return {
    cache,
    create,
    clearInstanceCache,
    service: createInlineDataViewService({ dataViews: { create, clearInstanceCache } }),
  };
};

describe('createInlineDataViewService', () => {
  describe('create', () => {
    it('applies defaults in isolation and releases the draft when reusing the final view', async () => {
      const { service, create, cache, clearInstanceCache } = setup();
      const original = await service.resolve({ title: 'logs-*' });
      const shared = await service.resolve(inlineSpec);
      shared.setFieldCount('@timestamp', 7);
      const spec = { ...original.toMinimalSpec(), fields: timestampFields };
      const draft = await create({ ...spec, id: 'creation-draft' });
      create.mockClear();
      create.mockResolvedValueOnce(draft);

      const result = await service.create(spec, { preferredTimeField: '@timestamp' });

      expect(create).toHaveBeenNthCalledWith(1, { ...spec, id: undefined });
      expect(draft.timeFieldName).toBe('@timestamp');
      expect(result).toBe(shared);
      expect(original.timeFieldName).toBeUndefined();
      expect(spec.id).toBe(original.id);
      expect(shared.getFieldAttrs().get('@timestamp')?.count).toBe(7);
      expect([...cache.values()]).toStrictEqual([original, shared]);
      expect(clearInstanceCache.mock.calls).toStrictEqual([['creation-draft']]);
    });

    it.each<[string, DataViewSpec['fields']]>([
      ['missing', {}],
      [
        'not a date',
        {
          '@timestamp': {
            name: '@timestamp',
            type: 'keyword',
            searchable: true,
            aggregatable: true,
          },
        },
      ],
    ])('keeps the specified time field when the preferred field is %s', async (_, fields) => {
      const { service } = setup();
      const spec = { title: 'logs-*', timeFieldName: 'event.created', fields };

      const result = await service.create(spec, { preferredTimeField: '@timestamp' });

      expect(result.timeFieldName).toBe('event.created');
      expect(result.id).toBe(generateInlineDataViewId(spec));
    });

    it('does not infer a time field unless requested', async () => {
      const { service } = setup();
      const spec = { title: 'logs-*', fields: timestampFields };

      const result = await service.create(spec);

      expect(result.timeFieldName).toBeUndefined();
      expect(result.id).toBe(generateInlineDataViewId(spec));
    });

    it('propagates creation failures without clearing other cached views', async () => {
      const { service, create, clearInstanceCache } = setup();
      const error = new Error('Unable to fetch fields');
      create.mockRejectedValueOnce(error);

      await expect(service.create(inlineSpec)).rejects.toBe(error);
      expect(clearInstanceCache).not.toHaveBeenCalled();
    });
  });

  describe('completeCreation', () => {
    it('finalizes a created view with its existing fields and releases its temporary ID', async () => {
      const { service, create, cache, clearInstanceCache } = setup();
      const created = await create({ ...inlineSpec, fields: timestampFields, id: 'created' });

      const result = await service.completeCreation(created);

      expect(result.id).toBe(inlineDataViewId);
      expect(create).toHaveBeenLastCalledWith({ ...created.toSpec(), id: inlineDataViewId }, true);
      expect([...cache.values()]).toStrictEqual([result]);
      expect(clearInstanceCache.mock.calls).toStrictEqual([['created']]);
    });

    it.each<DataViewSpec>([
      { ...inlineSpec, id: inlineDataViewId },
      { ...inlineSpec, id: 'saved', version: '1' },
      { ...inlineSpec, id: 'managed', managed: true },
      { ...inlineSpec, id: 'esql', type: ESQL_TYPE },
    ])('retains a created view that needs no replacement ($id)', async (spec) => {
      const { service, create, cache, clearInstanceCache } = setup();
      const created = await create(spec);

      expect(await service.completeCreation(created)).toBe(created);
      expect([...cache.values()]).toStrictEqual([created]);
      expect(clearInstanceCache).not.toHaveBeenCalled();
    });
  });

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

  describe('beginEdit', () => {
    it('isolates concurrent edits and releases only their own drafts', async () => {
      const { service, cache, clearInstanceCache } = setup();
      const original = await service.resolve(inlineSpec);
      const first = service.beginEdit(original);
      const second = service.beginEdit(original);
      const [firstDraft, secondDraft] = await Promise.all([first.draft, second.draft]);
      firstDraft.setIndexPattern('other-*');

      first.dispose();
      first.dispose();

      expect(firstDraft.id).not.toBe(secondDraft.id);
      expect(original.getIndexPattern()).toBe(inlineSpec.title);
      expect(secondDraft.getIndexPattern()).toBe(inlineSpec.title);
      expect([...cache.values()]).toContain(original);
      expect([...cache.values()]).toContain(secondDraft);
      expect(clearInstanceCache.mock.calls).toEqual([[firstDraft.id]]);
      second.dispose();
    });

    it.each([7, 0, undefined])(
      'copies only saved popularity (%s) to the shared instance',
      async (count) => {
        const { service, cache } = setup();
        const original = await service.resolve(inlineSpec);
        original.setFieldCount('edited', 3);
        original.setFieldCount('untouched', 2);
        const session = service.beginEdit(original);
        const draft = await session.draft;
        draft.setFieldCount('edited', count);
        original.setFieldCount('untouched', 9);

        const confirmed = await session.commit({ updatedFieldNames: ['edited'] });

        expect(confirmed).toBe(original);
        expect(confirmed.getFieldAttrs().get('edited')?.count).toBe(count);
        expect(confirmed.getFieldAttrs().get('untouched')?.count).toBe(9);
        expect([...cache.values()]).not.toContain(draft);
      }
    );

    it('does not merge stale popularity when no fields were saved', async () => {
      const { service } = setup();
      const original = await service.resolve(inlineSpec);
      original.setFieldCount('field', 2);
      const session = service.beginEdit(original);
      await session.draft;
      original.setFieldCount('field', 7);

      expect(await session.commit()).toBe(original);
      expect(original.getFieldAttrs().get('field')?.count).toBe(7);
    });

    it('commits composite subfields into a cached definition without changing other counts', async () => {
      const { service, cache } = setup();
      const original = await service.resolve(inlineSpec);
      const session = service.beginEdit(original);
      const draft = await session.draft;
      const fields = draft.addRuntimeField('composite', {
        type: 'composite',
        fields: {
          value: { type: 'long', popularity: 5 },
          label: { type: 'keyword', popularity: 2 },
        },
      });
      const target = await service.resolve(draft.toSpec());
      target.setFieldCount('composite.value', 50);
      target.setFieldCount('untouched', 9);

      const confirmed = await session.commit({ updatedFieldNames: fields.map(({ name }) => name) });

      expect(confirmed).toBe(target);
      expect(confirmed.id).not.toBe(original.id);
      expect(confirmed.getFieldAttrs().get('composite.value')?.count).toBe(5);
      expect(confirmed.getFieldAttrs().get('composite.label')?.count).toBe(2);
      expect(confirmed.getFieldAttrs().get('untouched')?.count).toBe(9);
      expect(original.getRuntimeField('composite')).toBeNull();
      expect([...cache.values()]).toContain(original);
      expect([...cache.values()]).not.toContain(draft);
    });

    it('evicts a pending draft promise on cancellation without caching its eventual result', async () => {
      const { service, create, cache, clearInstanceCache } = setup();
      const original = await service.resolve(inlineSpec);
      const preparation = Promise.withResolvers<void>();
      create.mockImplementationOnce((spec) => {
        const draft = createDataView(spec);
        const pendingDraft = preparation.promise.then(() => draft);
        cache.set(String(spec.id), pendingDraft);

        return pendingDraft;
      });
      const session = service.beginEdit(original);
      expect(cache.size).toBe(2);

      session.dispose();
      expect(clearInstanceCache).toHaveBeenCalledTimes(1);
      expect(cache.size).toBe(1);
      preparation.resolve();
      const draft = await session.draft;

      expect(cache.has(String(draft.id))).toBe(false);
      expect(cache.get(inlineDataViewId)).toBe(original);
      expect(clearInstanceCache.mock.calls).toEqual([[draft.id]]);
      await expect(session.commit()).rejects.toThrow('Cannot commit a disposed data view edit');
    });

    it('finishes an in-flight commit before disposing, and commits only once', async () => {
      const { service, create, cache, clearInstanceCache } = setup();
      const original = await service.resolve(inlineSpec);
      const session = service.beginEdit(original);
      const draft = await session.draft;
      draft.setIndexPattern('other-logs-*');
      const target = createDataView({ ...editedSpec, id: editedDataViewId });
      const finalization = Promise.withResolvers<DataView>();
      create.mockImplementationOnce(() => finalization.promise);

      const commit = session.commit();
      await waitFor(() =>
        expect(create).toHaveBeenLastCalledWith({ ...draft.toSpec(), id: editedDataViewId }, true)
      );
      session.dispose();
      expect(session.commit()).toBe(commit);
      expect([...cache.values()]).toContain(draft);
      finalization.resolve(target);

      expect(await commit).toBe(target);
      expect(clearInstanceCache.mock.calls).toEqual([[draft.id]]);
    });

    it('releases its draft on a finalization failure without evicting the source', async () => {
      const { service, create, cache } = setup();
      const original = await service.resolve(inlineSpec);
      const session = service.beginEdit(original);
      const draft = await session.draft;
      create.mockRejectedValueOnce(new Error('Finalization failed'));

      await expect(session.commit()).rejects.toThrow('Finalization failed');

      expect([...cache.values()]).not.toContain(draft);
      expect([...cache.values()]).toContain(original);
    });

    it('removes failed draft creations from the cache and preserves the error', async () => {
      const { service, create, clearInstanceCache } = setup();
      const original = createDataView({ ...inlineSpec, id: inlineDataViewId });
      create.mockRejectedValueOnce(new Error('Preparation failed'));
      const session = service.beginEdit(original);

      await expect(session.draft).rejects.toThrow('Preparation failed');
      session.dispose();
      expect(clearInstanceCache.mock.calls).toEqual([[create.mock.calls[0][0].id]]);
    });

    it.each<DataViewSpec>([
      { ...inlineSpec, id: 'saved', version: '1' },
      { ...inlineSpec, id: 'managed', managed: true },
    ])('never evicts the view retained by an excluded edit ($id)', async (spec) => {
      const { service, clearInstanceCache } = setup();
      const session = service.beginEdit(createDataView(spec));
      const draft = await session.draft;
      expect(await session.commit()).toBe(draft);
      session.dispose();
      expect(clearInstanceCache).not.toHaveBeenCalled();
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

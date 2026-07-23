/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { findWithTagFilter } from './resolve_tags';

const makeSoClient = (tags: Array<{ id: string; name: string }>) => {
  const soClient = savedObjectsClientMock.create();
  soClient.find.mockResolvedValue({
    saved_objects: tags.map((t) => ({
      id: t.id,
      type: 'tag',
      attributes: { name: t.name },
      references: [],
      score: 0,
    })),
    total: tags.length,
    page: 1,
    per_page: 1000,
  });
  return soClient;
};

// The entity `find` (the one for the searched type) vs the internal `tag` resolution finds.
const entityFindArgs = (soClient: ReturnType<typeof makeSoClient>) =>
  soClient.find.mock.calls.map(([args]) => args).find((args) => args.type === 'dashboard');

describe('findWithTagFilter', () => {
  it('returns an empty response and skips the entity query when tag_names match no tags', async () => {
    const soClient = makeSoClient([{ id: 'id1', name: 'Security' }]);
    const response = await findWithTagFilter(
      soClient,
      { type: 'dashboard', page: 2, perPage: 10 },
      { tag_names: 'does-not-exist' }
    );
    expect(response).toEqual({ saved_objects: [], total: 0, page: 2, per_page: 10 });
    expect(entityFindArgs(soClient)).toBeUndefined();
  });

  it('defaults page/per_page in the empty response', async () => {
    const soClient = makeSoClient([]);
    const response = await findWithTagFilter(soClient, { type: 'dashboard' }, { tag_names: 'x' });
    expect(response).toEqual({ saved_objects: [], total: 0, page: 1, per_page: 20 });
  });

  it('skips the entity query when tag_names is a comma-separated string (one literal name)', async () => {
    const soClient = makeSoClient([
      { id: 'id1', name: 'foo' },
      { id: 'id2', name: 'bar' },
    ]);
    // "foo,bar" is one literal name, not two — no tag has that name → empty result
    const response = await findWithTagFilter(
      soClient,
      { type: 'dashboard' },
      { tag_names: 'foo,bar' }
    );
    expect(response.saved_objects).toEqual([]);
    expect(entityFindArgs(soClient)).toBeUndefined();
  });

  it('uses tags ID even if tag_names resolves to nothing', async () => {
    const soClient = makeSoClient([]);
    await findWithTagFilter(soClient, { type: 'dashboard' }, { tags: 'id1' });
    expect(entityFindArgs(soClient)?.hasReference).toEqual([{ id: 'id1', type: 'tag' }]);
  });

  it('filters by tag_names as hasReference', async () => {
    const soClient = makeSoClient([
      { id: 'id1', name: 'Security' },
      { id: 'id2', name: 'Observability' },
    ]);
    await findWithTagFilter(
      soClient,
      { type: 'dashboard' },
      { tag_names: ['Security', 'Observability'] }
    );
    expect(entityFindArgs(soClient)?.hasReference).toEqual([
      { id: 'id1', type: 'tag' },
      { id: 'id2', type: 'tag' },
    ]);
  });

  it('filters by excluded_tag_names as hasNoReference', async () => {
    const soClient = makeSoClient([
      { id: 'id1', name: 'Security' },
      { id: 'id2', name: 'Observability' },
    ]);
    await findWithTagFilter(soClient, { type: 'dashboard' }, { excluded_tag_names: 'Security' });
    const args = entityFindArgs(soClient);
    expect(args?.hasNoReference).toEqual([{ id: 'id1', type: 'tag' }]);
    expect(args?.hasReference).toBeUndefined();
  });

  it('merges excluded_tags IDs and excluded_tag_names', async () => {
    const soClient = makeSoClient([{ id: 'id2', name: 'Observability' }]);
    await findWithTagFilter(
      soClient,
      { type: 'dashboard' },
      { excluded_tags: 'id1', excluded_tag_names: 'Observability' }
    );
    expect(entityFindArgs(soClient)?.hasNoReference).toEqual([
      { id: 'id1', type: 'tag' },
      { id: 'id2', type: 'tag' },
    ]);
  });

  it('includes all IDs when multiple tags share the same name', async () => {
    const soClient = makeSoClient([
      { id: 'id1', name: 'Security' },
      { id: 'id2', name: 'Security' },
    ]);
    await findWithTagFilter(soClient, { type: 'dashboard' }, { tag_names: 'Security' });
    expect(entityFindArgs(soClient)?.hasReference).toEqual([
      { id: 'id1', type: 'tag' },
      { id: 'id2', type: 'tag' },
    ]);
  });

  it('resolves tag names server-side with searchFields and phrase search', async () => {
    const soClient = makeSoClient([{ id: 'id1', name: 'Security' }]);
    await findWithTagFilter(
      soClient,
      { type: 'dashboard' },
      { tag_names: ['Security', 'Observability'] }
    );
    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tag',
        searchFields: ['name'],
        search: '"Security" "Observability"',
        defaultSearchOperator: 'OR',
      })
    );
  });

  it('resolves tag_names and excluded_tag_names in parallel', async () => {
    const soClient = makeSoClient([
      { id: 'id1', name: 'Security' },
      { id: 'id2', name: 'Observability' },
    ]);
    await findWithTagFilter(
      soClient,
      { type: 'dashboard' },
      { tag_names: 'Security', excluded_tag_names: 'Observability' }
    );
    const args = entityFindArgs(soClient);
    expect(args?.hasReference).toEqual([{ id: 'id1', type: 'tag' }]);
    expect(args?.hasNoReference).toEqual([{ id: 'id2', type: 'tag' }]);
    const tagFinds = soClient.find.mock.calls.filter(([a]) => a.type === 'tag');
    expect(tagFinds).toHaveLength(2);
  });
});

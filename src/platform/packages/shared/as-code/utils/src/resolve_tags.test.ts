/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { resolveTagsToFindOptions } from './resolve_tags';

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

describe('resolveTagsToFindOptions', () => {
  it('returns null when tag_names is provided but matches no tags', async () => {
    const soClient = makeSoClient([{ id: 'id1', name: 'Security' }]);
    const result = await resolveTagsToFindOptions({ tag_names: 'does-not-exist' }, soClient);
    expect(result).toBeNull();
  });

  it('does not return null when tags ID is provided even if tag_names resolves to nothing', async () => {
    const soClient = makeSoClient([]);
    const result = await resolveTagsToFindOptions({ tags: 'id1' }, soClient);
    expect(result).not.toBeNull();
    expect(result?.hasReference).toEqual([{ id: 'id1', type: 'tag' }]);
  });

  it('returns null when tag_names is a comma-separated string (treated as one literal name)', async () => {
    const soClient = makeSoClient([
      { id: 'id1', name: 'foo' },
      { id: 'id2', name: 'bar' },
    ]);
    // "foo,bar" is one literal name, not two — no tag has that name → null
    const result = await resolveTagsToFindOptions({ tag_names: 'foo,bar' }, soClient);
    expect(result).toBeNull();
  });

  it('resolves tag_names to hasReference', async () => {
    const soClient = makeSoClient([
      { id: 'id1', name: 'Security' },
      { id: 'id2', name: 'Observability' },
    ]);
    const result = await resolveTagsToFindOptions(
      { tag_names: ['Security', 'Observability'] },
      soClient
    );
    if (!result) throw new Error('Expected non-null result');
    expect(result.hasReference).toEqual([
      { id: 'id1', type: 'tag' },
      { id: 'id2', type: 'tag' },
    ]);
  });

  it('resolves excluded_tag_names into hasNoReference', async () => {
    const soClient = makeSoClient([
      { id: 'id1', name: 'Security' },
      { id: 'id2', name: 'Observability' },
    ]);
    const result = await resolveTagsToFindOptions({ excluded_tag_names: 'Security' }, soClient);
    if (!result) throw new Error('Expected non-null result');
    expect(result.hasNoReference).toEqual([{ id: 'id1', type: 'tag' }]);
    expect(result.hasReference).toBeUndefined();
  });

  it('merges excluded_tags IDs and excluded_tag_names', async () => {
    const soClient = makeSoClient([{ id: 'id2', name: 'Observability' }]);
    const result = await resolveTagsToFindOptions(
      { excluded_tags: 'id1', excluded_tag_names: 'Observability' },
      soClient
    );
    if (!result) throw new Error('Expected non-null result');
    expect(result.hasNoReference).toEqual([
      { id: 'id1', type: 'tag' },
      { id: 'id2', type: 'tag' },
    ]);
  });

  it('returns all IDs when multiple tags share the same name', async () => {
    const soClient = makeSoClient([
      { id: 'id1', name: 'Security' },
      { id: 'id2', name: 'Security' },
    ]);
    const result = await resolveTagsToFindOptions({ tag_names: 'Security' }, soClient);
    if (!result) throw new Error('Expected non-null result');
    expect(result.hasReference).toEqual([
      { id: 'id1', type: 'tag' },
      { id: 'id2', type: 'tag' },
    ]);
  });

  it('passes searchFields and search to SO find for server-side filtering', async () => {
    const soClient = makeSoClient([{ id: 'id1', name: 'Security' }]);
    await resolveTagsToFindOptions({ tag_names: ['Security', 'Observability'] }, soClient);
    expect(soClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
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
    const result = await resolveTagsToFindOptions(
      { tag_names: 'Security', excluded_tag_names: 'Observability' },
      soClient
    );
    if (!result) throw new Error('Expected non-null result');
    expect(result.hasReference).toEqual([{ id: 'id1', type: 'tag' }]);
    expect(result.hasNoReference).toEqual([{ id: 'id2', type: 'tag' }]);
    expect(soClient.find).toHaveBeenCalledTimes(2);
  });
});

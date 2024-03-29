/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { taggingApiMock } from '@kbn/saved-objects-tagging-oss-plugin/public/mocks';
import { getTagFindReferences } from './get_tag_references';

const tagNameToRef = (name: string) => ({
  type: 'tag',
  id: `id-of-${name}`,
});

describe('getTagFindReferences', () => {
  let taggingApi: ReturnType<typeof taggingApiMock.create>;
  const selectedTags = ['name-1', 'name-2'];

  beforeEach(() => {
    taggingApi = taggingApiMock.create();
    taggingApi.ui.convertNameToReference.mockImplementation(tagNameToRef);
  });

  it('returns undefined if `taggingApi` is not provided', () => {
    expect(getTagFindReferences({ selectedTags })).toBeUndefined();
  });
  it('returns undefined if `selectedTags` is not provided', () => {
    expect(getTagFindReferences({ taggingApi })).toBeUndefined();
  });

  it('returns the references for given names', () => {
    expect(getTagFindReferences({ selectedTags, taggingApi })).toEqual(
      selectedTags.map(tagNameToRef)
    );
  });

  it('ignores any unknown tag name', () => {
    taggingApi.ui.convertNameToReference.mockImplementation((name) => {
      if (name === 'name-1') {
        return undefined;
      }
      return tagNameToRef(name);
    });

    expect(getTagFindReferences({ selectedTags, taggingApi })).toEqual([tagNameToRef('name-2')]);
  });
});

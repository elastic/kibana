/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectReference } from '@kbn/core/public';
import { injectTagReferences } from './inject_tag_references';
import { InternalTagDecoratedSavedObject } from './types';

const ref = (type: string, id: string): SavedObjectReference => ({
  id,
  type,
  name: `ref-to-${type}-${id}`,
});

const tagRef = (id: string) => ref('tag', id);

const createObject = (): InternalTagDecoratedSavedObject => {
  // we really just need TS not to complain here.
  return {} as InternalTagDecoratedSavedObject;
};

describe('injectTagReferences', () => {
  let object: InternalTagDecoratedSavedObject;

  beforeEach(() => {
    object = createObject();
  });

  it('injects the `tag` references to the `__tags` field', () => {
    const references = [tagRef('tag-id-1'), tagRef('tag-id-2')];

    injectTagReferences(object, references);

    expect(object.__tags).toEqual(['tag-id-1', 'tag-id-2']);
  });

  it('only process the tag references', () => {
    const references = [
      tagRef('tag-id-1'),
      ref('dashboard', 'foo'),
      tagRef('tag-id-2'),
      ref('dashboard', 'baz'),
    ];

    injectTagReferences(object, references);

    expect(object.__tags).toEqual(['tag-id-1', 'tag-id-2']);
  });

  it('injects an empty list when not tag references are present', () => {
    injectTagReferences(object, [ref('dashboard', 'foo'), ref('dashboard', 'baz')]);

    expect(object.__tags).toEqual([]);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectReference } from '@kbn/core/public';
import { extractTagReferences } from './extract_tag_references';

const ref = (type: string, id: string, name = `ref-to-${type}-${id}`): SavedObjectReference => ({
  id,
  type,
  name,
});

const tagRef = (id: string): SavedObjectReference => ref('tag', id, `tag-${id}`);

describe('extractTagReferences', () => {
  it('generate tag references from the attributes', () => {
    const attributes = {
      __tags: ['tag-id-1', 'tag-id-2'],
    };
    const references: SavedObjectReference[] = [];

    const { references: resultRefs } = extractTagReferences({
      attributes,
      references,
    });

    expect(resultRefs).toEqual([tagRef('tag-id-1'), tagRef('tag-id-2')]);
  });

  it('removes the `__tag` property from the attributes', () => {
    const attributes = {
      someString: 'foo',
      someNumber: 42,
      __tags: ['tag-id-1', 'tag-id-2'],
    };
    const references: SavedObjectReference[] = [];

    const { attributes: resultAttrs } = extractTagReferences({
      attributes,
      references,
    });

    expect(resultAttrs).toEqual({ someString: 'foo', someNumber: 42 });
  });

  it('preserves the other references', () => {
    const attributes = {
      __tags: ['tag-id-1'],
    };

    const refA = ref('dashboard', 'dash-1');
    const refB = ref('visualization', 'vis-1');

    const { references: resultRefs } = extractTagReferences({
      attributes,
      references: [refA, refB],
    });

    expect(resultRefs).toEqual([refA, refB, tagRef('tag-id-1')]);
  });

  it('does not fail if `attributes` does not contain `__tags`', () => {
    const attributes = {
      someString: 'foo',
      someNumber: 42,
    };

    const refA = ref('dashboard', 'dash-1');
    const refB = ref('visualization', 'vis-1');

    const { attributes: resultAttrs, references: resultRefs } = extractTagReferences({
      attributes,
      references: [refA, refB],
    });

    expect(resultRefs).toEqual([refA, refB]);
    expect(resultAttrs).toEqual({ someString: 'foo', someNumber: 42 });
  });

  it('removes duplicated tags', () => {
    const attributes = {
      __tags: ['tag-id-1', 'tag-id-1', 'tag-id-1', 'tag-id-1', 'tag-id-2'],
    };

    const { references: resultRefs } = extractTagReferences({
      attributes,
      references: [] as SavedObjectReference[],
    });

    expect(resultRefs).toEqual([
      { id: 'tag-id-1', name: 'tag-tag-id-1', type: 'tag' },
      { id: 'tag-id-2', name: 'tag-tag-id-2', type: 'tag' },
    ]);
  });
});

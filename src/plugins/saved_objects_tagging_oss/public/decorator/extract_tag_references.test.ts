/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SavedObjectReference } from '../../../../core/public';
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
});

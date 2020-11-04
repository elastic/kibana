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

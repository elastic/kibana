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

import { taggingApiMock } from '../../../saved_objects_tagging_oss/public/mocks';
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

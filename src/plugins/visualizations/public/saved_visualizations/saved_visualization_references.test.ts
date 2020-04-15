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

import { extractReferences, injectReferences } from './saved_visualization_references';
import { VisSavedObject, SavedVisState } from '../types';
import { SavedObjectReference } from '../../../../core/types';

describe('extractReferences', () => {
  test('extracts nothing if savedSearchId is empty', () => {
    const doc = {
      id: '1',
      attributes: {
        title: 'test',
        visState: {} as any,
        foo: true,
      },
      references: [],
    };
    const [newAttributes] = extractReferences(doc.attributes);
    doc.attributes = newAttributes as any;
    expect(doc).toMatchSnapshot();
  });

  test('extracts references from savedSearchId', () => {
    const doc = {
      id: '1',
      attributes: {
        title: 'test',
        visState: {} as any,
        foo: true,
        savedSearchId: '123',
      },
      references: [] as SavedObjectReference[],
    };
    const [newAttributes, references] = extractReferences(doc.attributes);
    doc.attributes = newAttributes as any;
    doc.references = references;
    expect(doc).toMatchSnapshot();
  });

  test('extracts references from controls', () => {
    const doc = {
      id: '1',
      attributes: {
        foo: true,
        title: 'test',
        visState: {
          params: {
            controls: [
              {
                bar: true,
                indexPattern: 'pattern*',
              },
              {
                bar: false,
              },
            ],
          },
        } as any,
      },
      references: [] as SavedObjectReference[],
    };
    const [newAttributes, references] = extractReferences(doc.attributes);
    doc.attributes = newAttributes as any;
    doc.references = references;

    expect(doc).toMatchSnapshot();
  });
});

describe('injectReferences', () => {
  test('injects nothing when savedSearchRefName is null', () => {
    const context = {
      id: '1',
      title: 'test',
    } as VisSavedObject;
    injectReferences(context, []);
    expect(context).toMatchSnapshot();
  });

  test('injects references into context', () => {
    const context = {
      id: '1',
      title: 'test',
      savedSearchRefName: 'search_0',
      visState: ({
        params: {
          controls: [
            {
              foo: true,
              indexPatternRefName: 'control_0_index_pattern',
            },
            {
              foo: false,
            },
          ],
        },
      } as unknown) as SavedVisState,
    } as VisSavedObject;
    const references = [
      {
        name: 'search_0',
        type: 'search',
        id: '123',
      },
      {
        name: 'control_0_index_pattern',
        type: 'index-pattern',
        id: 'pattern*',
      },
    ];
    injectReferences(context, references);
    expect(context).toMatchSnapshot();
  });

  test(`fails when it can't find the saved search reference in the array`, () => {
    const context = {
      id: '1',
      savedSearchRefName: 'search_0',
      title: 'test',
    } as VisSavedObject;
    expect(() => injectReferences(context, [])).toThrowErrorMatchingInlineSnapshot(
      `"Could not find saved search reference \\"search_0\\""`
    );
  });

  test(`fails when it can't find the index pattern reference in the array`, () => {
    const context = {
      id: '1',
      title: 'test',
      visState: ({
        params: {
          controls: [
            {
              foo: true,
              indexPatternRefName: 'control_0_index_pattern',
            },
          ],
        },
      } as unknown) as SavedVisState,
    } as VisSavedObject;
    expect(() => injectReferences(context, [])).toThrowErrorMatchingInlineSnapshot(
      `"Could not find index pattern reference \\"control_0_index_pattern\\""`
    );
  });
});

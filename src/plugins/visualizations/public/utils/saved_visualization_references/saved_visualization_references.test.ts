/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { extractReferences, injectReferences } from './saved_visualization_references';
import { VisSavedObject } from '../../types';
import { SavedVisState } from '../../../common';

describe('extractReferences', () => {
  test('extracts nothing if savedSearchId is empty', () => {
    const doc = {
      id: '1',
      attributes: {
        foo: true,
      },
      references: [],
    };
    const updatedDoc = extractReferences(doc);
    expect(updatedDoc).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "foo": true,
        },
        "references": Array [],
      }
    `);
  });

  test('extracts references from savedSearchId', () => {
    const doc = {
      id: '1',
      attributes: {
        foo: true,
        savedSearchId: '123',
      },
      references: [],
    };
    const updatedDoc = extractReferences(doc);
    expect(updatedDoc).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "foo": true,
          "savedSearchRefName": "search_0",
        },
        "references": Array [
          Object {
            "id": "123",
            "name": "search_0",
            "type": "search",
          },
        ],
      }
    `);
  });

  test('extracts references from controls', () => {
    const doc = {
      id: '1',
      attributes: {
        foo: true,
        visState: JSON.stringify({
          type: 'input_control_vis',
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
        }),
      },
      references: [],
    };
    const updatedDoc = extractReferences(doc);

    expect(updatedDoc).toMatchInlineSnapshot(`
      Object {
        "attributes": Object {
          "foo": true,
          "visState": "{\\"type\\":\\"input_control_vis\\",\\"params\\":{\\"controls\\":[{\\"bar\\":true,\\"indexPatternRefName\\":\\"control_0_index_pattern\\"},{\\"bar\\":false}]}}",
        },
        "references": Array [
          Object {
            "id": "pattern*",
            "name": "control_0_index_pattern",
            "type": "index-pattern",
          },
        ],
      }
    `);
  });
});

describe('injectReferences', () => {
  test('injects nothing when savedSearchRefName is null', () => {
    const context = {
      id: '1',
      title: 'test',
    } as VisSavedObject;
    injectReferences(context, []);
    expect(context).toMatchInlineSnapshot(`
      Object {
        "id": "1",
        "title": "test",
      }
    `);
  });

  test('injects references into context', () => {
    const context = {
      id: '1',
      title: 'test',
      savedSearchRefName: 'search_0',
      visState: {
        type: 'input_control_vis',
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
      } as unknown as SavedVisState,
    } as unknown as VisSavedObject;
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
    expect(context).toMatchInlineSnapshot(`
      Object {
        "id": "1",
        "savedSearchId": "123",
        "title": "test",
        "visState": Object {
          "params": Object {
            "controls": Array [
              Object {
                "foo": true,
                "indexPattern": "pattern*",
              },
              Object {
                "foo": false,
              },
            ],
          },
          "type": "input_control_vis",
        },
      }
    `);
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
      visState: {
        type: 'input_control_vis',
        params: {
          controls: [
            {
              foo: true,
              indexPatternRefName: 'control_0_index_pattern',
            },
          ],
        },
      } as unknown as SavedVisState,
    } as unknown as VisSavedObject;
    expect(() => injectReferences(context, [])).toThrowErrorMatchingInlineSnapshot(
      `"Could not find index pattern reference \\"control_0_index_pattern\\""`
    );
  });
});

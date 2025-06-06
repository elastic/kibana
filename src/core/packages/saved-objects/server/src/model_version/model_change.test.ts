/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectDoc } from '../serialization';
import { SavedObjectsModelUnsafeTransformChange, UnsafeTransformFunction } from './model_change';
import {
  SavedObjectModelTransformationDoc,
  SavedObjectModelUnsafeTransformFn,
} from './transformations';

interface BeforeType {
  a: boolean;
}

interface AfterType extends BeforeType {
  aString: string;
}

const untypedTransformFn: SavedObjectModelUnsafeTransformFn = (doc) => {
  const attributes: AfterType = {
    ...doc.attributes,
    aString: doc.attributes.a ? 'true' : 'false',
  };

  return { document: { ...doc, attributes } };
};

const transformFn: SavedObjectModelUnsafeTransformFn<BeforeType, AfterType> = (
  doc: SavedObjectModelTransformationDoc<BeforeType>
) => {
  const attributes: AfterType = {
    ...doc.attributes,
    aString: doc.attributes.a ? 'true' : 'false',
  };

  return { document: { ...doc, attributes } };
};

describe('test', () => {
  it('allows executing', () => {
    const doc: SavedObjectDoc<BeforeType> = {
      id: 'someType:docId',
      type: 'someType',
      attributes: {
        a: false,
      },
    };
    const context = {};

    const utf = UnsafeTransformFunction.createTransformFunction(transformFn);

    const res = utf(doc, context);

    // this is how you would specify a change in the changes: []
    // const change: SavedObjectsModelUnsafeTransformChange = {
    //   type: 'unsafe_transform',
    //   transformFn: utf,
    // };

    expect(res).toMatchInlineSnapshot(`
      Object {
        "document": Object {
          "attributes": Object {
            "a": false,
            "aString": "false",
          },
          "id": "someType:docId",
          "type": "someType",
        },
      }
    `);
  });
});

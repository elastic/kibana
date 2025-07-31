/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectDoc } from '../serialization';
import { SavedObjectsModelUnsafeTransformChange } from './model_change';
import {
  SavedObjectModelTransformationContext,
  SavedObjectModelTransformationDoc,
  SavedObjectModelUnsafeTransformFn,
} from './transformations';

interface BeforeType {
  a: boolean;
}

interface AfterType extends BeforeType {
  aString: string;
}

describe('test', () => {
  const testDoc: SavedObjectDoc<BeforeType> = {
    id: 'someType:docId',
    type: 'someType',
    attributes: {
      a: false,
    },
  };
  const testContext: SavedObjectModelTransformationContext = {
    log: {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
    modelVersion: 1,
    namespaceType: 'agnostic',
  };

  it('TS fails if users try to define untyped transform functions', () => {
    const untypedTransformFn: SavedObjectModelUnsafeTransformFn = (doc) => {
      const attributes: AfterType = {
        // @ts-expect-error
        ...doc.attributes,
        // @ts-expect-error
        aString: doc.attributes.a ? 'true' : 'false',
      };

      return { document: { ...doc, attributes } };
    };

    expect(untypedTransformFn(testDoc, testContext)).toMatchInlineSnapshot(`
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

  it('allows defining transform changes', () => {
    const transformFn: SavedObjectModelUnsafeTransformFn<BeforeType, AfterType> = (
      doc: SavedObjectModelTransformationDoc<BeforeType>
    ) => {
      const attributes: AfterType = {
        ...doc.attributes,
        aString: doc.attributes.a ? 'true' : 'false',
      };

      return { document: { ...doc, attributes } };
    };

    // this is how you would specify a change in the changes: []
    const change: SavedObjectsModelUnsafeTransformChange = {
      type: 'unsafe_transform',
      transformFn: (typeSafeGuard) => typeSafeGuard(transformFn),
    };

    expect(change).toMatchInlineSnapshot(`
      Object {
        "transformFn": [Function],
        "type": "unsafe_transform",
      }
    `);
  });
});

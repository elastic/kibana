/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggerMock } from '@kbn/logging-mocks';
import type {
  SavedObjectsModelChange,
  SavedObjectModelTransformationDoc,
  SavedObjectModelTransformationContext,
  SavedObjectModelDataBackfillFn,
} from '@kbn/core-saved-objects-server';
import { buildModelVersionTransformFn } from './build_transform_fn';

describe('buildModelVersionTransformFn', () => {
  const stubDatabackfill = (): jest.MockedFn<SavedObjectModelDataBackfillFn> =>
    jest.fn().mockImplementation((doc: SavedObjectModelTransformationDoc) => ({}));

  const createContext = (): SavedObjectModelTransformationContext => ({
    log: loggerMock.create(),
    modelVersion: 42,
    namespaceType: 'single',
  });

  const createDoc = <T = any>(attributes: T = {} as T): SavedObjectModelTransformationDoc<T> => ({
    id: 'foo',
    type: 'bar',
    attributes,
  });

  it('returns a no-op function when no transform functions are present', () => {
    const changes: SavedObjectsModelChange[] = [
      { type: 'mappings_addition', addedMappings: {} },
      { type: 'mappings_deprecation', deprecatedMappings: [] },
    ];

    const mergedTransform = buildModelVersionTransformFn(changes);

    const context = createContext();
    const document = createDoc();

    const output = mergedTransform(document, context);
    // test that it returns the source doc unmodified
    expect(output.document).toEqual(createDoc());
  });

  describe('converting `data_backfill` changes', () => {
    it('calls the backfillFn with the correct parameters', () => {
      const backfillFn = jest.fn().mockImplementation(() => ({}));
      const changes: SavedObjectsModelChange[] = [
        {
          type: 'data_backfill',
          backfillFn,
        },
      ];

      const mergedTransform = buildModelVersionTransformFn(changes);
      const context = createContext();
      const document = createDoc({ oldProp: 'oldValue' });

      mergedTransform(document, context);

      expect(backfillFn).toHaveBeenCalledTimes(1);
      expect(backfillFn).toHaveBeenCalledWith(document, context);
    });

    it('merges top level fields', () => {
      const changes: SavedObjectsModelChange[] = [
        {
          type: 'data_backfill',
          backfillFn: (doc) => {
            return { attributes: { newProp: 'newValue' } };
          },
        },
      ];

      const mergedTransform = buildModelVersionTransformFn(changes);
      const context = createContext();
      const document = createDoc({ oldProp: 'oldValue' });

      const { document: output } = mergedTransform(document, context);

      expect(output.attributes).toEqual({
        oldProp: 'oldValue',
        newProp: 'newValue',
      });
    });

    it('merges nested fields', () => {
      const changes: SavedObjectsModelChange[] = [
        {
          type: 'data_backfill',
          backfillFn: (doc) => {
            return { attributes: { rootProp: { nestedNewProp: 'nestedNewValue' } } };
          },
        },
      ];

      const mergedTransform = buildModelVersionTransformFn(changes);
      const context = createContext();
      const document = createDoc({
        oldProp: 'oldValue',
        rootProp: { nestedOldProp: 'nestedOldValue' },
      });

      const { document: output } = mergedTransform(document, context);

      expect(output.attributes).toEqual({
        oldProp: 'oldValue',
        rootProp: { nestedOldProp: 'nestedOldValue', nestedNewProp: 'nestedNewValue' },
      });
    });
  });

  describe('converting `data_removal` changes', () => {
    it('removes top level fields', () => {
      const changes: SavedObjectsModelChange[] = [
        {
          type: 'data_removal',
          removedAttributePaths: ['deletedProp'],
        },
      ];

      const mergedTransform = buildModelVersionTransformFn(changes);
      const context = createContext();
      const document = createDoc({ deletedProp: 'deletedValue', keptProp: 'keptValue' });

      const { document: output } = mergedTransform(document, context);

      expect(output.attributes).toEqual({
        keptProp: 'keptValue',
      });
    });

    it('removes nested fields', () => {
      const changes: SavedObjectsModelChange[] = [
        {
          type: 'data_removal',
          removedAttributePaths: ['rootProps.nestedDeletedProp'],
        },
      ];

      const mergedTransform = buildModelVersionTransformFn(changes);
      const context = createContext();
      const document = createDoc({
        keptProp: 'keptValue',
        rootProps: { nestedDeletedProp: 'nestedDeletedValue', nestedKeptProp: 'nestedKeptValue' },
      });

      const { document: output } = mergedTransform(document, context);

      expect(output.attributes).toEqual({
        keptProp: 'keptValue',
        rootProps: { nestedKeptProp: 'nestedKeptValue' },
      });
    });

    it('does not fail if the path is empty', () => {
      const changes: SavedObjectsModelChange[] = [
        {
          type: 'data_removal',
          removedAttributePaths: ['some.emptyPath', 'deletedProp'],
        },
      ];

      const mergedTransform = buildModelVersionTransformFn(changes);
      const context = createContext();
      const document = createDoc({ deletedProp: 'deletedValue', keptProp: 'keptValue' });

      const { document: output } = mergedTransform(document, context);

      expect(output.attributes).toEqual({
        keptProp: 'keptValue',
      });
    });
  });

  describe('converting `unsafe_transform` changes', () => {
    it('calls the transformFn with the correct parameters', () => {
      const transformFn = jest.fn().mockImplementation((document) => ({ document }));
      const changes: SavedObjectsModelChange[] = [
        {
          type: 'unsafe_transform',
          transformFn,
        },
      ];

      const mergedTransform = buildModelVersionTransformFn(changes);
      const context = createContext();
      const document = createDoc({ oldProp: 'oldValue' });

      mergedTransform(document, context);

      expect(transformFn).toHaveBeenCalledTimes(1);
      expect(transformFn).toHaveBeenCalledWith(document, context);
    });

    it('executes the transform function', () => {
      const changes: SavedObjectsModelChange[] = [
        {
          type: 'unsafe_transform',
          transformFn: (document, ctx) => {
            delete document.attributes.oldProp;
            document.attributes.newProp = 'newValue';
            return { document };
          },
        },
      ];

      const mergedTransform = buildModelVersionTransformFn(changes);
      const context = createContext();
      const document = createDoc({ oldProp: 'oldValue', keptProp: 'keptValue' });

      const { document: output } = mergedTransform(document, context);

      expect(output.attributes).toEqual({
        keptProp: 'keptValue',
        newProp: 'newValue',
      });
    });
  });

  describe('execution order', () => {
    it('executes 2 functions in order', () => {
      const transform1 = stubDatabackfill();
      const transform2 = stubDatabackfill();
      const changes: SavedObjectsModelChange[] = [
        { type: 'data_backfill', backfillFn: transform1 },
        { type: 'data_backfill', backfillFn: transform2 },
      ];

      const mergedTransform = buildModelVersionTransformFn(changes);

      const context = createContext();
      const document = createDoc();

      mergedTransform(document, context);

      expect(transform1).toHaveBeenCalledTimes(1);
      expect(transform1).toHaveBeenCalledWith(document, context);
      expect(transform2).toHaveBeenCalledTimes(1);
      expect(transform2).toHaveBeenCalledWith(document, context);
      expect(transform1.mock.invocationCallOrder[0]).toBeLessThan(
        transform2.mock.invocationCallOrder[0]
      );
    });

    it('executes many functions in order', () => {
      const transform1 = stubDatabackfill();
      const transform2 = stubDatabackfill();
      const transform3 = stubDatabackfill();
      const transform4 = stubDatabackfill();
      const changes: SavedObjectsModelChange[] = [
        { type: 'data_backfill', backfillFn: transform1 },
        { type: 'data_backfill', backfillFn: transform2 },
        { type: 'data_backfill', backfillFn: transform3 },
        { type: 'data_backfill', backfillFn: transform4 },
      ];

      const mergedTransform = buildModelVersionTransformFn(changes);

      const context = createContext();
      const document = createDoc();

      mergedTransform(document, context);

      expect(transform1).toHaveBeenCalledTimes(1);
      expect(transform2).toHaveBeenCalledTimes(1);
      expect(transform3).toHaveBeenCalledTimes(1);
      expect(transform4).toHaveBeenCalledTimes(1);

      expect(transform1).toHaveBeenCalledWith(document, context);
      expect(transform2).toHaveBeenCalledWith(document, context);
      expect(transform3).toHaveBeenCalledWith(document, context);
      expect(transform4).toHaveBeenCalledWith(document, context);

      expect(transform1.mock.invocationCallOrder[0]).toBeLessThan(
        transform2.mock.invocationCallOrder[0]
      );
      expect(transform2.mock.invocationCallOrder[0]).toBeLessThan(
        transform3.mock.invocationCallOrder[0]
      );
      expect(transform3.mock.invocationCallOrder[0]).toBeLessThan(
        transform4.mock.invocationCallOrder[0]
      );
    });
  });

  describe('converting mixed change types', () => {
    it('chains and executes the changes', () => {
      const changes: SavedObjectsModelChange[] = [
        {
          type: 'data_backfill',
          backfillFn: (doc) => {
            return { attributes: { newField: 'newValue' } };
          },
        },
        {
          type: 'data_removal',
          removedAttributePaths: ['oldField'],
        },
        {
          type: 'unsafe_transform',
          transformFn: (document) => {
            document.attributes.unsafeNewProp = 'unsafeNewValue';
            return { document };
          },
        },
      ];

      const mergedTransform = buildModelVersionTransformFn(changes);
      const context = createContext();
      const document = createDoc({ oldField: 'oldValue', someProp: 'someValue' });

      const { document: output } = mergedTransform(document, context);

      expect(output.attributes).toEqual({
        someProp: 'someValue',
        newField: 'newValue',
        unsafeNewProp: 'unsafeNewValue',
      });
    });
  });
});

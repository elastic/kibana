/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type {
  SavedObjectsModelChange,
  SavedObjectModelTransformationFn,
  SavedObjectModelTransformationDoc,
  SavedObjectModelTransformationContext,
} from '@kbn/core-saved-objects-server';
import { buildModelVersionTransformFn } from './build_transform_fn';

describe('buildModelVersionTransformFn', () => {
  const stubTransform = (): jest.MockedFn<SavedObjectModelTransformationFn> =>
    jest.fn().mockImplementation((doc: SavedObjectModelTransformationDoc) => ({ document: doc }));

  const createContext = (): SavedObjectModelTransformationContext => ({
    log: loggerMock.create(),
    modelVersion: 42,
  });

  const createDoc = (): SavedObjectModelTransformationDoc => ({
    id: 'foo',
    type: 'bar',
    attributes: {},
  });

  it('builds the transform from a single function', () => {
    const transform1 = stubTransform();
    const changes: SavedObjectsModelChange[] = [{ type: 'data_backfill', transform: transform1 }];

    const mergedTransform = buildModelVersionTransformFn(changes);

    const context = createContext();
    const document = createDoc();

    mergedTransform(document, context);

    expect(transform1).toHaveBeenCalledTimes(1);
    expect(transform1).toHaveBeenCalledWith(document, context);
  });

  it('builds the transform from 2 functions', () => {
    const transform1 = stubTransform();
    const transform2 = stubTransform();
    const changes: SavedObjectsModelChange[] = [
      { type: 'data_backfill', transform: transform1 },
      { type: 'data_backfill', transform: transform2 },
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

  it('builds the transform from more functions', () => {
    const transform1 = stubTransform();
    const transform2 = stubTransform();
    const transform3 = stubTransform();
    const transform4 = stubTransform();
    const changes: SavedObjectsModelChange[] = [
      { type: 'data_backfill', transform: transform1 },
      { type: 'data_backfill', transform: transform2 },
      { type: 'data_backfill', transform: transform3 },
      { type: 'data_backfill', transform: transform4 },
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
});

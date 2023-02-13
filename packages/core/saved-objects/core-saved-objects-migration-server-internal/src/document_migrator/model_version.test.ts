/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import type {
  SavedObjectsType,
  SavedObjectsModelVersion,
  SavedObjectModelTransformationFn,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';
import { Transform, TransformType } from './types';
import { getModelVersionTransforms, convertModelVersionTransformFn } from './model_version';

describe('getModelVersionTransforms', () => {
  let log: MockedLogger;

  const expectTransform = (type: TransformType, version: string): Transform => ({
    version,
    transformType: type,
    transform: expect.any(Function),
  });

  const createType = (parts: Partial<SavedObjectsType>): SavedObjectsType => ({
    name: 'test',
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: {} },
    ...parts,
  });

  beforeEach(() => {
    log = loggerMock.create();
  });

  it('generate transforms for model version having a transformation', () => {
    const typeDefinition = createType({
      name: 'foo',
      modelVersions: {
        '1': {
          modelChange: {
            type: 'expansion',
            transformation: { up: jest.fn(), down: jest.fn() },
          },
        },
        '2': {
          modelChange: {
            type: 'expansion',
            addedMappings: { foo: { type: 'keyword' } },
          },
        },
        '3': {
          modelChange: {
            type: 'expansion',
            transformation: { up: jest.fn(), down: jest.fn() },
          },
        },
      },
    });

    const transforms = getModelVersionTransforms({ log, typeDefinition });

    expect(transforms).toEqual([
      expectTransform(TransformType.Migrate, '10.1.0'),
      expectTransform(TransformType.Migrate, '10.3.0'),
    ]);
  });

  it('accepts provider functions', () => {
    const typeDefinition = createType({
      name: 'foo',
      modelVersions: () => ({
        '1': {
          modelChange: {
            type: 'expansion',
            transformation: { up: jest.fn(), down: jest.fn() },
          },
        },
        '2': {
          modelChange: {
            type: 'expansion',
            addedMappings: { foo: { type: 'keyword' } },
          },
        },
        '3': {
          modelChange: {
            type: 'expansion',
            transformation: { up: jest.fn(), down: jest.fn() },
          },
        },
      }),
    });

    const transforms = getModelVersionTransforms({ log, typeDefinition });

    expect(transforms).toEqual([
      expectTransform(TransformType.Migrate, '10.1.0'),
      expectTransform(TransformType.Migrate, '10.3.0'),
    ]);
  });
});

describe('convertModelVersionTransformFn', () => {
  let log: MockedLogger;
  let i = 0;

  beforeEach(() => {
    i = 0;
    log = loggerMock.create();
  });

  const createDoc = (): SavedObjectUnsanitizedDoc => {
    return { type: 'foo', id: `foo-${i++}`, attributes: {} };
  };

  const createModelTransformFn = (): jest.MockedFunction<SavedObjectModelTransformationFn> => {
    return jest.fn().mockImplementation((doc: unknown) => ({
      document: doc,
    }));
  };

  it('generates a transform function calling the model transform', () => {
    const upTransform = createModelTransformFn();
    const downTransform = createModelTransformFn();

    const definition: SavedObjectsModelVersion = {
      modelChange: {
        type: 'expansion',
        transformation: { up: upTransform, down: downTransform },
      },
    };

    const transform = convertModelVersionTransformFn({
      log,
      modelVersion: 1,
      virtualVersion: '10.1.0',
      definition,
    });

    expect(upTransform).not.toHaveBeenCalled();
    expect(downTransform).not.toHaveBeenCalled();

    const doc = createDoc();
    const context = { log, modelVersion: 1 };

    transform(doc);

    expect(upTransform).toHaveBeenCalledTimes(1);
    expect(downTransform).not.toHaveBeenCalled();
    expect(upTransform).toHaveBeenCalledWith(doc, context);
  });

  it('returns the document from the model transform', () => {
    const upTransform = createModelTransformFn();

    const resultDoc = createDoc();
    upTransform.mockImplementation((doc) => {
      return { document: resultDoc };
    });

    const definition: SavedObjectsModelVersion = {
      modelChange: {
        type: 'expansion',
        transformation: { up: upTransform, down: jest.fn() },
      },
    };

    const transform = convertModelVersionTransformFn({
      log,
      modelVersion: 1,
      virtualVersion: '10.1.0',
      definition,
    });

    const doc = createDoc();

    const result = transform(doc);
    expect(result).toEqual({
      transformedDoc: resultDoc,
      additionalDocs: [],
    });
  });
});

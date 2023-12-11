/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { convertModelVersionBackwardConversionSchemaMock } from './model_version.test.mocks';
import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import type {
  SavedObjectsType,
  SavedObjectsModelVersion,
  SavedObjectModelDataBackfillFn,
  SavedObjectUnsanitizedDoc,
} from '@kbn/core-saved-objects-server';
import { modelVersionToVirtualVersion } from '@kbn/core-saved-objects-base-server-internal';
import { Transform, TransformType } from './types';
import {
  getModelVersionTransforms,
  convertModelVersionTransformFn,
  getModelVersionSchemas,
} from './model_version';

const createType = (parts: Partial<SavedObjectsType>): SavedObjectsType => ({
  name: 'test',
  hidden: false,
  namespaceType: 'single',
  mappings: { properties: {} },
  ...parts,
});

describe('getModelVersionTransforms', () => {
  let log: MockedLogger;

  const expectTransform = (type: TransformType, version: string): Transform => ({
    version,
    transformType: type,
    transform: expect.any(Function),
  });

  beforeEach(() => {
    log = loggerMock.create();
  });

  it('generate transforms for all model versions', () => {
    const typeDefinition = createType({
      name: 'foo',
      modelVersions: {
        '1': {
          changes: [{ type: 'data_backfill', backfillFn: jest.fn() }],
        },
        '2': {
          changes: [{ type: 'mappings_deprecation', deprecatedMappings: [] }],
        },
        '3': {
          changes: [{ type: 'mappings_addition', addedMappings: {} }],
        },
      },
    });

    const transforms = getModelVersionTransforms({ log, typeDefinition });

    expect(transforms).toEqual([
      expectTransform(TransformType.Migrate, modelVersionToVirtualVersion(1)),
      expectTransform(TransformType.Migrate, modelVersionToVirtualVersion(2)),
      expectTransform(TransformType.Migrate, modelVersionToVirtualVersion(3)),
    ]);
  });

  it('accepts provider functions', () => {
    const typeDefinition = createType({
      name: 'foo',
      modelVersions: () => ({
        '1': {
          changes: [{ type: 'data_backfill', backfillFn: jest.fn() }],
        },
        '2': {
          changes: [{ type: 'data_backfill', backfillFn: jest.fn() }],
        },
        '3': {
          changes: [{ type: 'data_backfill', backfillFn: jest.fn() }],
        },
      }),
    });

    const transforms = getModelVersionTransforms({ log, typeDefinition });

    expect(transforms).toEqual([
      expectTransform(TransformType.Migrate, modelVersionToVirtualVersion(1)),
      expectTransform(TransformType.Migrate, modelVersionToVirtualVersion(2)),
      expectTransform(TransformType.Migrate, modelVersionToVirtualVersion(3)),
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

  const createModelTransformFn = (): jest.MockedFunction<SavedObjectModelDataBackfillFn> => {
    return jest.fn().mockImplementation((doc: unknown) => ({}));
  };

  it('generates a transform function calling the model transform', () => {
    const typeDefinition = createType({});
    const upTransform = createModelTransformFn();

    const definition: SavedObjectsModelVersion = {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: upTransform,
        },
      ],
    };

    const transform = convertModelVersionTransformFn({
      log,
      modelVersion: 1,
      virtualVersion: '10.1.0',
      modelVersionDefinition: definition,
      typeDefinition,
    });

    expect(upTransform).not.toHaveBeenCalled();

    const doc = createDoc();
    const context = { log, modelVersion: 1, namespaceType: typeDefinition.namespaceType };

    transform(doc);

    expect(upTransform).toHaveBeenCalledTimes(1);
    expect(upTransform).toHaveBeenCalledWith(doc, context);
  });

  it('generates a transform function calling all model transforms of the version', () => {
    const typeDefinition = createType({});
    const upTransform1 = createModelTransformFn();
    const upTransform2 = createModelTransformFn();

    const definition: SavedObjectsModelVersion = {
      changes: [
        {
          type: 'data_backfill',
          backfillFn: upTransform1,
        },
        {
          type: 'data_backfill',
          backfillFn: upTransform2,
        },
      ],
    };

    const transform = convertModelVersionTransformFn({
      log,
      modelVersion: 1,
      virtualVersion: '10.1.0',
      typeDefinition,
      modelVersionDefinition: definition,
    });

    const doc = createDoc();
    const context = { log, modelVersion: 1, namespaceType: typeDefinition.namespaceType };

    transform(doc);

    expect(upTransform1).toHaveBeenCalledTimes(1);
    expect(upTransform1).toHaveBeenCalledWith(doc, context);
    expect(upTransform2).toHaveBeenCalledTimes(1);
    expect(upTransform2).toHaveBeenCalledWith(doc, context);
  });
});

describe('getModelVersionSchemas', () => {
  beforeEach(() => {
    convertModelVersionBackwardConversionSchemaMock.mockReset();
    convertModelVersionBackwardConversionSchemaMock.mockImplementation(() => jest.fn());
  });

  it('calls convertModelVersionBackwardConversionSchema with the correct parameters', () => {
    const schema1 = jest.fn();
    const schema3 = jest.fn();

    const typeDefinition = createType({
      name: 'foo',
      modelVersions: {
        1: {
          changes: [],
          schemas: {
            forwardCompatibility: schema1,
          },
        },
        2: {
          changes: [],
          schemas: {},
        },
        3: {
          changes: [],
          schemas: {
            forwardCompatibility: schema3,
          },
        },
      },
    });

    getModelVersionSchemas({ typeDefinition });

    expect(convertModelVersionBackwardConversionSchemaMock).toHaveBeenCalledTimes(2);
    expect(convertModelVersionBackwardConversionSchemaMock).toHaveBeenCalledWith(schema1);
    expect(convertModelVersionBackwardConversionSchemaMock).toHaveBeenCalledWith(schema3);
  });

  it('generate schemas for correct model versions', () => {
    const schema1 = jest.fn();
    const schema3 = jest.fn();

    const typeDefinition = createType({
      name: 'foo',
      modelVersions: {
        1: {
          changes: [],
          schemas: {
            forwardCompatibility: schema1,
          },
        },
        2: {
          changes: [],
          schemas: {},
        },
        3: {
          changes: [],
          schemas: {
            forwardCompatibility: schema3,
          },
        },
      },
    });

    const schemas = getModelVersionSchemas({ typeDefinition });

    expect(schemas).toEqual({
      [modelVersionToVirtualVersion(1)]: expect.any(Function),
      [modelVersionToVirtualVersion(3)]: expect.any(Function),
    });
  });
});

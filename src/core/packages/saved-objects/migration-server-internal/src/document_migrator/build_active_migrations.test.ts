/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getCoreTransformsMock,
  getConversionTransformsMock,
  getModelVersionTransformsMock,
  getModelVersionSchemasMock,
  getReferenceTransformsMock,
  resetAllMocks,
  validateTypeMigrationsMock,
} from './build_active_migrations.test.mocks';

import { loggerMock, MockedLogger } from '@kbn/logging-mocks';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { buildActiveMigrations } from './build_active_migrations';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
import { Transform, TransformType } from './types';

const kibanaVersion = '3.2.3';

describe('buildActiveMigrations', () => {
  let log: MockedLogger;
  let typeRegistry: SavedObjectTypeRegistry;

  const buildMigrations = () => {
    return buildActiveMigrations({ typeRegistry, kibanaVersion, log });
  };

  const createType = (parts: Partial<SavedObjectsType>): SavedObjectsType => ({
    name: 'test',
    hidden: false,
    namespaceType: 'single',
    mappings: { properties: {} },
    ...parts,
  });

  const transform = (type: TransformType, version: string, deferred?: boolean): Transform => ({
    ...(deferred != null ? { deferred } : {}),
    version,
    transformType: type,
    transform: jest.fn(),
  });

  const expectTransform = (type: TransformType, version: string, deferred?: boolean): Transform =>
    expect.objectContaining({
      ...(deferred != null ? { deferred } : {}),
      version,
      transformType: type,
      transform: expect.any(Function),
    });

  const addType = (parts: Partial<SavedObjectsType>) => {
    typeRegistry.registerType(createType(parts));
  };

  beforeEach(() => {
    resetAllMocks();

    log = loggerMock.create();
    typeRegistry = new SavedObjectTypeRegistry();
  });

  describe('validation', () => {
    it('calls validateMigrationsMapObject with the correct parameters', () => {
      addType({
        name: 'foo',
        migrations: {
          '7.12.0': jest.fn(),
          '7.16.0': jest.fn(),
        },
      });

      addType({
        name: 'bar',
        migrations: () => ({
          '7.114.0': jest.fn(),
          '8.3.0': jest.fn(),
        }),
      });

      buildMigrations();

      expect(validateTypeMigrationsMock).toHaveBeenCalledTimes(2);
      expect(validateTypeMigrationsMock).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: expect.objectContaining({ name: 'foo' }),
          kibanaVersion,
        })
      );
      expect(validateTypeMigrationsMock).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: expect.objectContaining({ name: 'bar' }),
          kibanaVersion,
        })
      );
    });

    it('throws if validateMigrationsMapObject throws', () => {
      validateTypeMigrationsMock.mockImplementation(() => {
        throw new Error('woups');
      });

      addType({
        name: 'foo',
        migrations: {
          '7.12.0': jest.fn(),
          '7.16.0': jest.fn(),
        },
      });

      expect(() => buildMigrations()).toThrowErrorMatchingInlineSnapshot(`"woups"`);
    });
  });

  describe('type migrations', () => {
    it('returns the migrations registered by the type as transforms', () => {
      addType({
        name: 'foo',
        migrations: {
          '7.12.0': jest.fn(),
          '7.16.0': jest.fn(),
          '8.3.0': {
            transform: jest.fn(),
          },
          '8.4.0': {
            // @ts-expect-error
            deferred: true,
            transform: jest.fn(),
          },
        },
      });

      const migrations = buildMigrations();

      expect(Object.keys(migrations).sort()).toEqual(['foo']);
      expect(migrations.foo.transforms).toEqual([
        expectTransform(TransformType.Migrate, '7.12.0', false),
        expectTransform(TransformType.Migrate, '7.16.0', false),
        expectTransform(TransformType.Migrate, '8.3.0', false),
        expectTransform(TransformType.Migrate, '8.4.0', true),
      ]);
    });
  });

  describe('model version transforms', () => {
    it('calls getModelVersionTransforms with the correct parameters', () => {
      const foo = createType({ name: 'foo' });
      const bar = createType({ name: 'bar' });

      addType(foo);
      addType(bar);

      buildMigrations();

      expect(getModelVersionTransformsMock).toHaveBeenCalledTimes(2);
      expect(getModelVersionTransformsMock).toHaveBeenNthCalledWith(1, {
        log,
        typeDefinition: foo,
      });
      expect(getModelVersionTransformsMock).toHaveBeenNthCalledWith(2, {
        log,
        typeDefinition: bar,
      });
    });

    it('adds the transform from getModelVersionTransforms to each type', () => {
      const foo = createType({ name: 'foo' });
      const bar = createType({ name: 'bar' });

      addType(foo);
      addType(bar);

      getModelVersionTransformsMock.mockImplementation(
        ({ typeDefinition }: { typeDefinition: SavedObjectsType }) => {
          if (typeDefinition.name === 'foo') {
            return [transform(TransformType.Migrate, '7.12.0')];
          } else {
            return [transform(TransformType.Migrate, '8.3.0')];
          }
        }
      );

      const migrations = buildMigrations();

      expect(Object.keys(migrations).sort()).toEqual(['bar', 'foo']);
      expect(migrations.foo.transforms).toEqual([expectTransform(TransformType.Migrate, '7.12.0')]);
      expect(migrations.bar.transforms).toEqual([expectTransform(TransformType.Migrate, '8.3.0')]);
    });
  });

  describe('model version schemas', () => {
    it('calls getModelVersionSchemas with the correct parameters', () => {
      const foo = createType({ name: 'foo' });
      const bar = createType({ name: 'bar' });

      addType(foo);
      addType(bar);

      buildMigrations();

      expect(getModelVersionSchemasMock).toHaveBeenCalledTimes(2);
      expect(getModelVersionSchemasMock).toHaveBeenNthCalledWith(1, {
        typeDefinition: foo,
      });
      expect(getModelVersionSchemasMock).toHaveBeenNthCalledWith(2, {
        typeDefinition: bar,
      });
    });

    it('adds the schemas from getModelVersionSchemas to each type', () => {
      const foo = createType({ name: 'foo' });
      const bar = createType({ name: 'bar' });

      addType(foo);
      addType(bar);

      getModelVersionSchemasMock.mockImplementation(
        ({ typeDefinition }: { typeDefinition: SavedObjectsType }) => {
          if (typeDefinition.name === 'foo') {
            return {
              '7.10.0': jest.fn(),
            };
          } else {
            return {
              '8.3.0': jest.fn(),
              '8.4.0': jest.fn(),
            };
          }
        }
      );

      const migrations = buildMigrations();

      expect(Object.keys(migrations).sort()).toEqual(['bar', 'foo']);
      expect(migrations.foo.versionSchemas).toEqual({
        '7.10.0': expect.any(Function),
      });
      expect(migrations.bar.versionSchemas).toEqual({
        '8.3.0': expect.any(Function),
        '8.4.0': expect.any(Function),
      });
    });
  });

  describe('internal transforms', () => {
    it('calls getReferenceTransforms with the correct parameters', () => {
      const foo = createType({ name: 'foo' });
      const bar = createType({ name: 'bar' });

      addType(foo);
      addType(bar);

      buildMigrations();

      expect(getReferenceTransformsMock).toHaveBeenCalledTimes(1);
      expect(getReferenceTransformsMock).toHaveBeenCalledWith(typeRegistry);
    });

    it('adds the transform from getReferenceTransforms to each type', () => {
      const foo = createType({ name: 'foo' });
      const bar = createType({ name: 'bar' });

      addType(foo);
      addType(bar);

      getReferenceTransformsMock.mockReturnValue([
        transform(TransformType.Reference, '7.12.0'),
        transform(TransformType.Reference, '7.17.0'),
      ]);

      const migrations = buildMigrations();
      expect(Object.keys(migrations).sort()).toEqual(['bar', 'foo']);
      expect(migrations.foo.transforms).toEqual([
        expectTransform(TransformType.Reference, '7.12.0'),
        expectTransform(TransformType.Reference, '7.17.0'),
      ]);
      expect(migrations.bar.transforms).toEqual([
        expectTransform(TransformType.Reference, '7.12.0'),
        expectTransform(TransformType.Reference, '7.17.0'),
      ]);
    });

    it('adds the transform from getCoreTransforms to each type', () => {
      const foo = createType({ name: 'foo' });
      const bar = createType({ name: 'bar' });

      addType(foo);
      addType(bar);

      getCoreTransformsMock.mockReturnValue([transform(TransformType.Core, '8.8.0')]);

      const migrations = buildMigrations();
      expect(Object.keys(migrations).sort()).toEqual(['bar', 'foo']);
      expect(migrations.foo.transforms).toEqual([expectTransform(TransformType.Core, '8.8.0')]);
      expect(migrations.bar.transforms).toEqual([expectTransform(TransformType.Core, '8.8.0')]);
    });

    it('calls getConversionTransforms with the correct parameters', () => {
      const foo = createType({ name: 'foo' });
      const bar = createType({ name: 'bar' });

      addType(foo);
      addType(bar);

      buildMigrations();

      expect(getConversionTransformsMock).toHaveBeenCalledTimes(2);
      expect(getConversionTransformsMock).toHaveBeenNthCalledWith(1, foo);
      expect(getConversionTransformsMock).toHaveBeenNthCalledWith(2, bar);
    });

    it('adds the transform from getConversionTransforms to each type', () => {
      const foo = createType({ name: 'foo' });
      const bar = createType({ name: 'bar' });

      addType(foo);
      addType(bar);

      getConversionTransformsMock.mockImplementation((type: SavedObjectsType) => {
        if (type.name === 'foo') {
          return [transform(TransformType.Convert, '7.12.0')];
        } else {
          return [transform(TransformType.Convert, '8.7.0')];
        }
      });

      const migrations = buildMigrations();
      expect(Object.keys(migrations).sort()).toEqual(['bar', 'foo']);
      expect(migrations.foo.transforms).toEqual([expectTransform(TransformType.Convert, '7.12.0')]);
      expect(migrations.bar.transforms).toEqual([expectTransform(TransformType.Convert, '8.7.0')]);
    });
  });

  describe('ordering', () => {
    it('sort the migrations correctly', () => {
      addType({
        name: 'foo',
        migrations: {
          '7.12.0': jest.fn(),
          '7.16.0': jest.fn(),
        },
      });

      addType({
        name: 'bar',
        migrations: {
          '7.17.0': jest.fn(),
          '8.2.1': jest.fn(),
        },
      });

      getModelVersionTransformsMock.mockImplementation(
        ({ typeDefinition }: { typeDefinition: SavedObjectsType }) => {
          if (typeDefinition.name === 'foo') {
            return [transform(TransformType.Migrate, '7.18.2')];
          } else {
            return [transform(TransformType.Migrate, '8.4.2')];
          }
        }
      );

      getCoreTransformsMock.mockReturnValue([transform(TransformType.Core, '8.8.0')]);

      getReferenceTransformsMock.mockReturnValue([
        transform(TransformType.Reference, '7.12.0'),
        transform(TransformType.Reference, '7.17.3'),
      ]);

      getConversionTransformsMock.mockImplementation((type: SavedObjectsType) => {
        if (type.name === 'foo') {
          return [transform(TransformType.Convert, '7.14.0')];
        } else {
          return [transform(TransformType.Convert, '8.7.0')];
        }
      });

      const migrations = buildMigrations();

      expect(Object.keys(migrations).sort()).toEqual(['bar', 'foo']);
      expect(migrations.foo.transforms).toEqual([
        expectTransform(TransformType.Core, '8.8.0'),
        expectTransform(TransformType.Reference, '7.12.0'),
        expectTransform(TransformType.Migrate, '7.12.0'),
        expectTransform(TransformType.Convert, '7.14.0'),
        expectTransform(TransformType.Migrate, '7.16.0'),
        expectTransform(TransformType.Reference, '7.17.3'),
        expectTransform(TransformType.Migrate, '7.18.2'),
      ]);
      expect(migrations.bar.transforms).toEqual([
        expectTransform(TransformType.Core, '8.8.0'),
        expectTransform(TransformType.Reference, '7.12.0'),
        expectTransform(TransformType.Migrate, '7.17.0'),
        expectTransform(TransformType.Reference, '7.17.3'),
        expectTransform(TransformType.Migrate, '8.2.1'),
        expectTransform(TransformType.Migrate, '8.4.2'),
        expectTransform(TransformType.Convert, '8.7.0'),
      ]);
    });
  });

  describe('versions', () => {
    it('returns the latest migrations versions', () => {
      addType({
        name: 'foo',
        migrations: {
          '7.12.0': jest.fn(),
          '7.16.0': jest.fn(),
          '8.3.0': jest.fn(),
        },
      });
      getCoreTransformsMock.mockReturnValue([
        transform(TransformType.Core, '8.8.0'),
        transform(TransformType.Core, '8.9.0'),
      ]);
      getReferenceTransformsMock.mockReturnValue([
        transform(TransformType.Reference, '7.12.0'),
        transform(TransformType.Reference, '7.17.3'),
      ]);
      getConversionTransformsMock.mockReturnValue([
        transform(TransformType.Convert, '7.14.0'),
        transform(TransformType.Convert, '7.15.0'),
      ]);

      expect(buildMigrations()).toHaveProperty(
        'foo.latestVersion',
        expect.objectContaining({
          [TransformType.Convert]: '7.15.0',
          [TransformType.Core]: '8.9.0',
          [TransformType.Migrate]: '8.3.0',
          [TransformType.Reference]: '7.17.3',
        })
      );
    });

    it('returns the latest not deferred migrations versions', () => {
      addType({
        name: 'foo',
        migrations: {
          '7.12.0': {
            // @ts-expect-error
            deferred: true,
            transform: jest.fn(),
          },
          '7.16.0': jest.fn(),
          '8.3.0': {
            // @ts-expect-error
            deferred: true,
            transform: jest.fn(),
          },
        },
      });
      getCoreTransformsMock.mockReturnValue([
        transform(TransformType.Core, '8.7.0', true),
        transform(TransformType.Core, '8.8.0'),
        transform(TransformType.Core, '8.9.0', true),
      ]);

      expect(buildMigrations()).toHaveProperty(
        'foo.immediateVersion',
        expect.objectContaining({
          [TransformType.Core]: '8.8.0',
          [TransformType.Migrate]: '7.16.0',
        })
      );
    });
  });
});

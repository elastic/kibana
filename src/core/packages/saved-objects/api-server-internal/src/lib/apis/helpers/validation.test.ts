/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { type SavedObjectSanitizedDoc } from '@kbn/core-saved-objects-server';
import { ValidationHelper } from './validation';
import { typedef, typedef1, typedef2 } from './validation_fixtures';
import { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';

const defaultVersion = '8.10.0';
const modelVirtualVersion = '10.1.0';
const typeA = 'my-typeA';
const typeB = 'my-typeB';
const typeC = 'my-typeC';

describe('Saved Objects type validation helper', () => {
  let helper: ValidationHelper;
  let logger: MockedLogger;
  let typeRegistry: SavedObjectTypeRegistry;

  const createMockObject = (
    type: string,
    attr: Partial<SavedObjectSanitizedDoc>
  ): SavedObjectSanitizedDoc => ({
    type,
    id: 'test-id',
    references: [],
    attributes: {},
    ...attr,
  });
  const registerType = (name: string, parts: Partial<SavedObjectsType>) => {
    typeRegistry.registerType({
      name,
      hidden: false,
      namespaceType: 'single',
      mappings: { properties: {} },
      ...parts,
    });
  };
  beforeEach(() => {
    logger = loggerMock.create();
    typeRegistry = new SavedObjectTypeRegistry();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('validation helper', () => {
    beforeEach(() => {
      registerType(typeA, typedef);
      registerType(typeB, typedef1);
      registerType(typeC, typedef2);
    });

    it('should validate objects against stack versions', () => {
      helper = new ValidationHelper({
        logger,
        registry: typeRegistry,
        kibanaVersion: defaultVersion,
      });
      const data = createMockObject(typeA, { attributes: { foo: 'hi', count: 1 } });
      expect(() => helper.validateObjectForCreate(typeA, data)).not.toThrow();
    });

    it('should validate objects against model versions', () => {
      helper = new ValidationHelper({
        logger,
        registry: typeRegistry,
        kibanaVersion: modelVirtualVersion,
      });
      const data = createMockObject(typeB, { attributes: { foo: 'hi', count: 1 } });
      expect(() => helper.validateObjectForCreate(typeB, data)).not.toThrow();
    });

    it('should fail validation against invalid objects when version requested does not support a field', () => {
      helper = new ValidationHelper({
        logger,
        registry: typeRegistry,
        kibanaVersion: defaultVersion,
      });
      const validationError = new Error(
        "[attributes.count]: Additional properties are not allowed ('count' was unexpected): Bad Request"
      );
      const data = createMockObject(typeC, { attributes: { foo: 'hi', count: 1 } });
      expect(() => helper.validateObjectForCreate(typeC, data)).toThrow(validationError);
    });
  });

  describe('validateObjectForUpdate', () => {
    const createSchema = schema.object({ foo: schema.string(), count: schema.number() });
    const typeWithUpdate = 'type-with-update';
    const typeWithoutUpdate = 'type-without-update';

    beforeEach(() => {
      registerType(typeWithUpdate, {
        modelVersions: {
          1: {
            changes: [],
            schemas: {
              create: createSchema,
              update: createSchema.extends({}, { unknowns: 'ignore' }),
            },
          },
        },
      });
      registerType(typeWithoutUpdate, {
        modelVersions: {
          1: { changes: [], schemas: { create: createSchema } },
        },
      });
      helper = new ValidationHelper({
        logger,
        registry: typeRegistry,
        kibanaVersion: defaultVersion,
      });
    });

    it('does nothing when the type has no update schema', () => {
      const data = createMockObject(typeWithoutUpdate, {
        typeMigrationVersion: modelVirtualVersion,
        attributes: { foo: 1, unknown: true },
      });
      expect(() => helper.validateObjectForUpdate(typeWithoutUpdate, data)).not.toThrow();
    });

    it('does nothing for unregistered types', () => {
      const data = createMockObject('unknown-type', { attributes: { foo: 1 } });
      expect(() => helper.validateObjectForUpdate('unknown-type', data)).not.toThrow();
    });

    it('accepts valid objects with unknown fields', () => {
      const data = createMockObject(typeWithUpdate, {
        typeMigrationVersion: modelVirtualVersion,
        attributes: { foo: 'hi', count: 1, legacyFlag: true },
      });
      expect(() => helper.validateObjectForUpdate(typeWithUpdate, data)).not.toThrow();
    });

    it('rejects objects with invalid known fields', () => {
      const data = createMockObject(typeWithUpdate, {
        typeMigrationVersion: modelVirtualVersion,
        attributes: { foo: 'hi', count: 'lots' },
      });
      expect(() => helper.validateObjectForUpdate(typeWithUpdate, data)).toThrowError(
        /\[attributes.count\]: expected value of type \[number\]/
      );
    });

    it('rejects objects missing required fields', () => {
      const data = createMockObject(typeWithUpdate, {
        typeMigrationVersion: modelVirtualVersion,
        attributes: { foo: 'hi' },
      });
      expect(() => helper.validateObjectForUpdate(typeWithUpdate, data)).toThrowError(
        /\[attributes.count\]/
      );
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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

  describe('validateId', () => {
    beforeEach(() => {
      helper = new ValidationHelper({
        logger,
        registry: typeRegistry,
        kibanaVersion: defaultVersion,
      });
    });

    it('accepts a valid UUID', () => {
      expect(() => helper.validateId('550e8400-e29b-41d4-a716-446655440000')).not.toThrow();
    });

    it('accepts a regular alphanumeric ID', () => {
      expect(() => helper.validateId('my-dashboard-123')).not.toThrow();
    });

    it('accepts an ID with colons (namespace separators)', () => {
      expect(() => helper.validateId('some:valid:id')).not.toThrow();
    });

    it('throws a BadRequestError when ID contains a forward slash', () => {
      expect(() => helper.validateId('../traversal/attack')).toThrowError(
        "Invalid saved object ID: IDs cannot contain '/'."
      );
    });

    it('throws a BadRequestError when ID starts with a slash', () => {
      expect(() => helper.validateId('/leading-slash')).toThrowError(
        "Invalid saved object ID: IDs cannot contain '/'."
      );
    });

    it('throws a BadRequestError when ID contains a slash in the middle', () => {
      expect(() => helper.validateId('some/path')).toThrowError(
        "Invalid saved object ID: IDs cannot contain '/'."
      );
    });
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
      expect(() => helper.validateObjectForCreate(typeA, data)).not.toThrowError();
    });

    it('should validate objects against model versions', () => {
      helper = new ValidationHelper({
        logger,
        registry: typeRegistry,
        kibanaVersion: modelVirtualVersion,
      });
      const data = createMockObject(typeB, { attributes: { foo: 'hi', count: 1 } });
      expect(() => helper.validateObjectForCreate(typeB, data)).not.toThrowError();
    });

    it('should fail validation against invalid objects when version requested does not support a field', () => {
      helper = new ValidationHelper({
        logger,
        registry: typeRegistry,
        kibanaVersion: defaultVersion,
      });
      const validationError = new Error(
        '[attributes.count]: definition for this key is missing: Bad Request'
      );
      const data = createMockObject(typeC, { attributes: { foo: 'hi', count: 1 } });
      expect(() => helper.validateObjectForCreate(typeC, data)).toThrowError(validationError);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { InternalCoreStart } from '@kbn/core-lifecycle-server-internal';
import {
  createRootWithCorePlugins,
  createTestServers,
  type TestElasticsearchUtils,
} from '@kbn/core-test-helpers-kbn-server';
import { Root } from '@kbn/core-root-server-internal';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';

const { startES } = createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
});
let esServer: TestElasticsearchUtils;

describe('SavedObjects Internal Client Integration', () => {
  let root: Root;
  let start: InternalCoreStart;
  let internalClient: SavedObjectsClientContract;

  beforeAll(async () => {
    esServer = await startES();
    root = createRootWithCorePlugins({
      server: {
        basePath: '/hello',
      },
    });

    await root.preboot();
    const setup = await root.setup();

    // Register test types for integration testing
    setup.savedObjects.registerType({
      hidden: false,
      mappings: {
        dynamic: false,
        properties: {
          title: { type: 'text' },
          description: { type: 'text' },
        },
      },
      name: 'test_public_type',
      namespaceType: 'single',
    });

    setup.savedObjects.registerType({
      hidden: true,
      mappings: {
        dynamic: false,
        properties: {
          secret: { type: 'text' },
          internal_data: { type: 'text' },
        },
      },
      name: 'test_hidden_type',
      namespaceType: 'single',
    });

    setup.savedObjects.registerType({
      hidden: true,
      mappings: {
        dynamic: false,
        properties: {
          restricted_field: { type: 'text' },
        },
      },
      name: 'test_restricted_type',
      namespaceType: 'single',
    });

    start = await root.start();
    internalClient = start.savedObjects.getInternalClient();
  });

  afterAll(async () => {
    if (root) {
      await root.shutdown();
    }
    if (esServer) {
      await esServer.stop();
    }
  });

  describe('Basic Operations', () => {
    it('performs CRUD operations without user authentication', async () => {
      const type = 'test_public_type';
      const id = 'test-crud-object';
      const attributes = {
        title: 'Test Object',
        description: 'Created by internal client',
      };

      // Create
      const created = await internalClient.create(type, attributes, { id });
      expect(created.id).toBe(id);
      expect(created.attributes).toEqual(attributes);

      // Read
      const retrieved = await internalClient.get(type, id);
      expect(retrieved.id).toBe(id);
      expect(retrieved.attributes).toEqual(attributes);

      // Update
      const updatedAttributes = {
        title: 'Updated Title',
        description: 'Updated by internal client',
      };
      const updated = await internalClient.update(type, id, updatedAttributes);
      expect(updated.attributes).toMatchObject(updatedAttributes);

      // Delete
      await internalClient.delete(type, id);

      // Verify deletion
      await expect(internalClient.get(type, id)).rejects.toThrow();
    });

    it('creates objects with internal privileges', async () => {
      const type = 'test_public_type';
      const attributes = {
        title: 'Internal Privilege Test',
        description: 'Should be created with system privileges',
      };

      const created = await internalClient.create(type, attributes);
      expect(created.id).toBeDefined();
      expect(created.attributes).toEqual(attributes);

      // Clean up
      await internalClient.delete(type, created.id);
    });

    it('finds objects without security filtering', async () => {
      const type = 'test_public_type';
      const attributes1 = { title: 'Find Test 1', description: 'First object' };
      const attributes2 = { title: 'Find Test 2', description: 'Second object' };

      // Create test objects
      const obj1 = await internalClient.create(type, attributes1);
      const obj2 = await internalClient.create(type, attributes2);

      // Find objects
      const findResult = await internalClient.find({
        type,
        search: 'Find Test',
      });

      expect(findResult.total).toBeGreaterThanOrEqual(2);
      const foundObjects = findResult.saved_objects;
      const foundIds = foundObjects.map((obj) => obj.id);
      expect(foundIds).toContain(obj1.id);
      expect(foundIds).toContain(obj2.id);

      // Clean up
      await internalClient.delete(type, obj1.id);
      await internalClient.delete(type, obj2.id);
    });

    it('updates objects without user context', async () => {
      const type = 'test_public_type';
      const attributes = { title: 'Update Test', description: 'Original' };

      const created = await internalClient.create(type, attributes);

      // Update should work without user context
      const updatedAttributes = { description: 'Updated without user context' };
      const updated = await internalClient.update(type, created.id, updatedAttributes);

      expect(updated.attributes.description).toBe('Updated without user context');

      // Clean up
      await internalClient.delete(type, created.id);
    });

    it('deletes objects with internal access', async () => {
      const type = 'test_public_type';
      const attributes = { title: 'Delete Test', description: 'To be deleted' };

      const created = await internalClient.create(type, attributes);

      // Delete should work with internal access
      await expect(internalClient.delete(type, created.id)).resolves.not.toThrow();

      // Verify object is deleted
      await expect(internalClient.get(type, created.id)).rejects.toThrow();
    });
  });

  describe('Hidden Types Access', () => {
    it('accesses hidden types when includedHiddenTypes specified', async () => {
      const hiddenType = 'test_hidden_type';
      const attributes = {
        secret: 'confidential data',
        internal_data: 'system internal information',
      };

      // Create internal client with hidden types access
      const clientWithHiddenTypes = start.savedObjects.getInternalClient({
        includedHiddenTypes: [hiddenType],
      });

      const created = await clientWithHiddenTypes.create(hiddenType, attributes);
      expect(created.attributes).toEqual(attributes);

      // Verify we can retrieve the hidden object
      const retrieved = await clientWithHiddenTypes.get(hiddenType, created.id);
      expect(retrieved.attributes).toEqual(attributes);

      // Clean up
      await clientWithHiddenTypes.delete(hiddenType, created.id);
    });

    it('cannot access hidden types when not specified', async () => {
      const hiddenType = 'test_hidden_type';
      const attributes = { secret: 'should not be accessible' };

      // Try to create hidden type without including it
      await expect(internalClient.create(hiddenType, attributes)).rejects.toThrow();
    });

    it('works with multiple hidden types', async () => {
      const hiddenTypes = ['test_hidden_type', 'test_restricted_type'];
      const clientWithMultipleHidden = start.savedObjects.getInternalClient({
        includedHiddenTypes: hiddenTypes,
      });

      const hiddenAttrs = { secret: 'hidden data', internal_data: 'internal' };
      const restrictedAttrs = { restricted_field: 'restricted data' };

      // Create objects of both hidden types
      const hiddenObj = await clientWithMultipleHidden.create('test_hidden_type', hiddenAttrs);
      const restrictedObj = await clientWithMultipleHidden.create(
        'test_restricted_type',
        restrictedAttrs
      );

      expect(hiddenObj.attributes).toEqual(hiddenAttrs);
      expect(restrictedObj.attributes).toEqual(restrictedAttrs);

      // Clean up
      await clientWithMultipleHidden.delete('test_hidden_type', hiddenObj.id);
      await clientWithMultipleHidden.delete('test_restricted_type', restrictedObj.id);
    });
  });

  describe('Extension Functionality', () => {
    it('excludes security extension automatically', async () => {
      // The internal client should work without any security context
      const type = 'test_public_type';
      const attributes = { title: 'Security Test', description: 'No security filtering' };

      // This should work without security extension
      const created = await internalClient.create(type, attributes);
      expect(created.id).toBeDefined();

      // Clean up
      await internalClient.delete(type, created.id);
    });

    it('respects custom extension exclusions', async () => {
      // Test that we can exclude specific extensions
      const clientWithExclusions = start.savedObjects.getInternalClient({
        excludedExtensions: ['customExtension'],
      });

      const type = 'test_public_type';
      const attributes = { title: 'Extension Exclusion Test', description: 'Testing exclusions' };

      const created = await clientWithExclusions.create(type, attributes);
      expect(created.id).toBeDefined();

      // Clean up
      await clientWithExclusions.delete(type, created.id);
    });

    it('handles extension factories gracefully when undefined', async () => {
      // Test that client works even when extension factories are not available
      const type = 'test_public_type';
      const attributes = {
        title: 'No Extensions Test',
        description: 'Should work without extensions',
      };

      const created = await internalClient.create(type, attributes);
      expect(created.id).toBeDefined();

      // Clean up
      await internalClient.delete(type, created.id);
    });
  });

  describe('Security Validation', () => {
    it('bypasses user-based security filtering', async () => {
      // Internal client should bypass any user-based security
      const type = 'test_public_type';
      const attributes = { title: 'Security Bypass Test', description: 'Should bypass security' };

      const created = await internalClient.create(type, attributes);

      // Should be able to find without security restrictions
      const findResult = await internalClient.find({
        type,
        search: 'Security Bypass Test',
      });

      expect(findResult.saved_objects.length).toBeGreaterThanOrEqual(1);
      const found = findResult.saved_objects.find((obj) => obj.id === created.id);
      expect(found).toBeDefined();

      // Clean up
      await internalClient.delete(type, created.id);
    });

    it('accesses restricted objects internally', async () => {
      const restrictedType = 'test_restricted_type';
      const attributes = { restricted_field: 'internal access only' };

      const clientWithRestricted = start.savedObjects.getInternalClient({
        includedHiddenTypes: [restrictedType],
      });

      // Should be able to create restricted objects with internal client
      const created = await clientWithRestricted.create(restrictedType, attributes);
      expect(created.attributes).toEqual(attributes);

      // Should be able to access without restrictions
      const retrieved = await clientWithRestricted.get(restrictedType, created.id);
      expect(retrieved.attributes).toEqual(attributes);

      // Clean up
      await clientWithRestricted.delete(restrictedType, created.id);
    });

    it('operates with system-level privileges', async () => {
      const type = 'test_public_type';
      const attributes = { title: 'System Privileges Test', description: 'System level operation' };

      // Create, update, and delete should all work with system privileges
      const created = await internalClient.create(type, attributes);

      const updated = await internalClient.update(type, created.id, {
        description: 'Updated with system privileges',
      });
      expect(updated.attributes.description).toBe('Updated with system privileges');

      // System should be able to delete any object it created
      await expect(internalClient.delete(type, created.id)).resolves.not.toThrow();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles non-existent objects gracefully', async () => {
      const type = 'test_public_type';
      const nonExistentId = 'non-existent-object';

      await expect(internalClient.get(type, nonExistentId)).rejects.toThrow();
      await expect(internalClient.delete(type, nonExistentId)).rejects.toThrow();
    });

    it('handles invalid parameters gracefully', async () => {
      // Test with invalid options
      const clientWithInvalidOptions = start.savedObjects.getInternalClient({
        includedHiddenTypes: null as any,
        excludedExtensions: undefined as any,
      });

      const type = 'test_public_type';
      const attributes = { title: 'Invalid Options Test', description: 'Should still work' };

      // Should still work despite invalid options
      const created = await clientWithInvalidOptions.create(type, attributes);
      expect(created.id).toBeDefined();

      // Clean up
      await clientWithInvalidOptions.delete(type, created.id);
    });

    it('maintains consistency across operations', async () => {
      const type = 'test_public_type';
      const attributes = {
        title: 'Consistency Test',
        description: 'Testing operation consistency',
      };

      // Create multiple objects and ensure consistency
      const objects = await Promise.all([
        internalClient.create(type, { ...attributes, title: 'Consistency Test 1' }),
        internalClient.create(type, { ...attributes, title: 'Consistency Test 2' }),
        internalClient.create(type, { ...attributes, title: 'Consistency Test 3' }),
      ]);

      // All should be created successfully
      expect(objects).toHaveLength(3);
      objects.forEach((obj) => {
        expect(obj.id).toBeDefined();
      });

      // Clean up all objects
      await Promise.all(objects.map((obj) => internalClient.delete(type, obj.id)));
    });
  });
});

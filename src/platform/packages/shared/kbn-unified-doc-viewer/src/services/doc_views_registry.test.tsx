/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DocViewsRegistry } from './doc_views_registry';

const docView1 = {
  id: 'doc-view-1',
  order: 10,
  title: 'Render function',
  render: jest.fn(),
};

const docView2 = {
  id: 'doc-view-2',
  order: 20,
  title: 'Render function',
  render: jest.fn(),
};

describe('DocViewerRegistry', () => {
  test('can be initialized from an array of doc views', () => {
    const registry = new DocViewsRegistry([docView1, docView2]);

    expect(registry.getAll()).toHaveLength(2);
  });

  test('can be initialized from another DocViewsRegistry instance', () => {
    const registry = new DocViewsRegistry([docView1, docView2]);
    const newRegistry = new DocViewsRegistry(registry);

    expect(registry.getAll()).toHaveLength(2);
    expect(newRegistry.getAll()).toHaveLength(2);
    expect(registry).not.toBe(newRegistry);
  });

  describe('#add', () => {
    test('should add a doc view to the registry in the correct order', () => {
      const registry = new DocViewsRegistry([docView1]);

      registry.add(docView2);

      const docViews = registry.getAll();

      expect(docViews[0]).toHaveProperty('id', 'doc-view-1');
      expect(docViews[1]).toHaveProperty('id', 'doc-view-2');
    });

    test('should throw an error when the passed doc view already exists for the given id', () => {
      const registry = new DocViewsRegistry([docView1]);

      expect(() => registry.add(docView1)).toThrow(
        'DocViewsRegistry#add: a DocView is already registered with id "doc-view-1".'
      );
    });
  });

  describe('#removeById', () => {
    test('should remove a doc view given the passed id', () => {
      const registry = new DocViewsRegistry([docView1, docView2]);

      const docViews = registry.getAll();

      expect(docViews[0]).toHaveProperty('id', 'doc-view-1');
      expect(docViews[1]).toHaveProperty('id', 'doc-view-2');

      registry.removeById('doc-view-1');

      expect(registry.getAll()[0]).toHaveProperty('id', 'doc-view-2');
    });
  });

  describe('#enableById & #disableById', () => {
    test('should enable/disable a doc view given the passed id', () => {
      const registry = new DocViewsRegistry([docView1, docView2]);

      const docViews = registry.getAll();

      expect(docViews[0]).toHaveProperty('enabled', true);
      expect(docViews[1]).toHaveProperty('enabled', true);

      registry.disableById('doc-view-1');

      expect(registry.getAll()[0]).toHaveProperty('enabled', false);

      registry.enableById('doc-view-1');

      expect(registry.getAll()[0]).toHaveProperty('enabled', true);
    });
  });

  describe('#clone', () => {
    test('should return a new DocViewRegistry instance starting from the current one', () => {
      const registry = new DocViewsRegistry([docView1, docView2]);

      const clonedRegistry = registry.clone();
      const docViews = clonedRegistry.getAll();

      expect(docViews[0]).toHaveProperty('id', 'doc-view-1');
      expect(docViews[1]).toHaveProperty('id', 'doc-view-2');
      expect(registry).not.toBe(clonedRegistry);

      // Test against shared references between clones
      expect(clonedRegistry).not.toBe(registry);

      // Mutating a cloned registry should not affect the original registry
      registry.disableById('doc-view-1');
      expect(registry.getAll()[0]).toHaveProperty('enabled', false);
      expect(clonedRegistry.getAll()[0]).toHaveProperty('enabled', true);

      clonedRegistry.add({
        id: 'additional-doc-view',
        order: 30,
        title: 'Render function',
        render: jest.fn(),
      });

      expect(registry.getAll().length).toBe(2);
      expect(clonedRegistry.getAll().length).toBe(3);
    });
  });
});

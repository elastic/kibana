/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { DocViewsRegistry } from './doc_views_registry';

const fnDocView = {
  id: 'function-doc-view',
  order: 10,
  title: 'Render function',
  render: jest.fn(),
};
const componentDocView = {
  id: 'component-doc-view',
  order: 20,
  title: 'React component',
  component: () => <div>test</div>,
};

describe('DocViewerRegistry', () => {
  test('can be initialized from an array of doc views', () => {
    const registry = new DocViewsRegistry([fnDocView, componentDocView]);

    expect(registry.getAll()).toHaveLength(2);
  });

  test('can be initialized from another DocViewsRegistry instance', () => {
    const registry = new DocViewsRegistry([fnDocView, componentDocView]);
    const newRegistry = new DocViewsRegistry(registry);

    expect(registry.getAll()).toHaveLength(2);
    expect(newRegistry.getAll()).toHaveLength(2);
    expect(registry).not.toBe(newRegistry);
  });

  describe('#add', () => {
    test('should add a doc view to the registry in the correct order', () => {
      const registry = new DocViewsRegistry([componentDocView]);

      registry.add(fnDocView);

      const docViews = registry.getAll();

      expect(docViews[0]).toHaveProperty('id', 'function-doc-view');
      expect(docViews[1]).toHaveProperty('id', 'component-doc-view');
    });

    test('should throw an error when the passed doc view already exists for the given id', () => {
      const registry = new DocViewsRegistry([fnDocView]);

      expect(() => registry.add(fnDocView)).toThrow(
        'DocViewsRegistry#add: a DocView is already registered with id "function-doc-view".'
      );
    });
  });

  describe('#removeById', () => {
    test('should remove a doc view given the passed id', () => {
      const registry = new DocViewsRegistry([fnDocView, componentDocView]);

      const docViews = registry.getAll();

      expect(docViews[0]).toHaveProperty('id', 'function-doc-view');
      expect(docViews[1]).toHaveProperty('id', 'component-doc-view');

      registry.removeById('function-doc-view');

      expect(registry.getAll()[0]).toHaveProperty('id', 'component-doc-view');
    });
  });

  describe('#enableById & #disableById', () => {
    test('should enable/disable a doc view given the passed id', () => {
      const registry = new DocViewsRegistry([fnDocView, componentDocView]);

      const docViews = registry.getAll();

      expect(docViews[0]).toHaveProperty('enabled', true);
      expect(docViews[1]).toHaveProperty('enabled', true);

      registry.disableById('function-doc-view');

      expect(registry.getAll()[0]).toHaveProperty('enabled', false);

      registry.enableById('function-doc-view');

      expect(registry.getAll()[0]).toHaveProperty('enabled', true);
    });
  });

  describe('#clone', () => {
    test('should return a new DocViewRegistry instance starting from the current one', () => {
      const registry = new DocViewsRegistry([fnDocView, componentDocView]);

      const clonedRegistry = registry.clone();
      const docViews = clonedRegistry.getAll();

      expect(docViews[0]).toHaveProperty('id', 'function-doc-view');
      expect(docViews[1]).toHaveProperty('id', 'component-doc-view');
      expect(registry).not.toBe(clonedRegistry);
    });
  });
});

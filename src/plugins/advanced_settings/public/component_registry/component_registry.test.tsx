/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { ComponentRegistry } from './component_registry';

describe('ComponentRegistry', () => {
  describe('register', () => {
    it('should allow a component to be registered', () => {
      const component = () => <div />;
      new ComponentRegistry().setup.register(
        ComponentRegistry.componentType.PAGE_TITLE_COMPONENT,
        component
      );
    });

    it('should disallow registering a component with a duplicate id', () => {
      const registry = new ComponentRegistry();
      const component = () => <div />;
      registry.setup.register(ComponentRegistry.componentType.PAGE_TITLE_COMPONENT, component);
      expect(() =>
        registry.setup.register(ComponentRegistry.componentType.PAGE_TITLE_COMPONENT, () => (
          <span />
        ))
      ).toThrowErrorMatchingSnapshot();
    });

    it('should allow a component to be overriden', () => {
      const registry = new ComponentRegistry();
      const component = () => <div />;
      registry.setup.register(ComponentRegistry.componentType.PAGE_TITLE_COMPONENT, component);

      const anotherComponent = () => <span />;
      registry.setup.register(
        ComponentRegistry.componentType.PAGE_TITLE_COMPONENT,
        anotherComponent,
        true
      );

      expect(registry.start.get(ComponentRegistry.componentType.PAGE_TITLE_COMPONENT)).toBe(
        anotherComponent
      );
    });
  });

  describe('get', () => {
    it('should allow a component to be retrieved', () => {
      const registry = new ComponentRegistry();
      const component = () => <div />;
      registry.setup.register(ComponentRegistry.componentType.PAGE_TITLE_COMPONENT, component);
      expect(registry.start.get(ComponentRegistry.componentType.PAGE_TITLE_COMPONENT)).toBe(
        component
      );
    });
  });

  it('should set a displayName for the component if one does not exist', () => {
    const component: React.ComponentType = () => <div />;
    const registry = new ComponentRegistry();
    registry.setup.register(ComponentRegistry.componentType.PAGE_TITLE_COMPONENT, component);

    expect(component.displayName).toEqual(ComponentRegistry.componentType.PAGE_TITLE_COMPONENT);
  });

  it('should not set a displayName for the component if one already exists', () => {
    const component: React.ComponentType = () => <div />;
    component.displayName = '<AwesomeComponent>';
    const registry = new ComponentRegistry();

    registry.setup.register(ComponentRegistry.componentType.PAGE_TITLE_COMPONENT, component);

    expect(component.displayName).toEqual('<AwesomeComponent>');
  });
});

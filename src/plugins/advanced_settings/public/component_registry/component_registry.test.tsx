/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

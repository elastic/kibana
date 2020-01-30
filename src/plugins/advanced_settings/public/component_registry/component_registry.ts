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

import { ComponentType } from 'react';
import { PageTitle } from './page_title';
import { PageSubtitle } from './page_subtitle';
import { PageFooter } from './page_footer';

enum Id {
  PAGE_TITLE_COMPONENT,
  PAGE_SUBTITLE_COMPONENT,
  PAGE_FOOTER_COMPONENT,
}

type RegistryComponent = ComponentType<Record<string, any> | undefined>;

export class ComponentRegistry {
  static readonly componentType = Id;
  static readonly defaultRegistry: Record<Id, RegistryComponent> = {
    [Id.PAGE_TITLE_COMPONENT]: PageTitle,
    [Id.PAGE_SUBTITLE_COMPONENT]: PageSubtitle,
    [Id.PAGE_FOOTER_COMPONENT]: PageFooter,
  };

  registry: { [key in Id]?: RegistryComponent } = {};

  /**
   * Attempts to register the provided component, with the ability to optionally allow
   * the component to override an existing one.
   *
   * If the intent is to override, then `allowOverride` must be set to true, otherwise an exception is thrown.
   *
   * @param {*} id the id of the component to register
   * @param {*} component the component
   * @param {*} allowOverride (default: false) - optional flag to allow this component to override a previously registered component
   */
  private register(id: Id, component: RegistryComponent, allowOverride = false) {
    if (!allowOverride && id in this.registry) {
      throw new Error(`Component with id ${id} is already registered.`);
    }

    this.registry[id] = component;
  }

  /**
   * Retrieve a registered component by its ID.
   * If the component does not exist, then an exception is thrown.
   *
   * @param {*} id the ID of the component to retrieve
   */
  private get(id: Id): RegistryComponent {
    return this.registry[id] || ComponentRegistry.defaultRegistry[id];
  }

  setup = {
    componentType: ComponentRegistry.componentType,
    register: this.register.bind(this),
  };

  start = {
    componentType: ComponentRegistry.componentType,
    get: this.get.bind(this),
  };
}

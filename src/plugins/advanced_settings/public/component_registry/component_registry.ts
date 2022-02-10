/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ComponentType } from 'react';
import { PageTitle } from './page_title';
import { PageSubtitle } from './page_subtitle';
import { PageFooter } from './page_footer';

type Id =
  | 'advanced_settings_page_title'
  | 'advanced_settings_page_subtitle'
  | 'advanced_settings_page_footer';

const componentType: { [key: string]: Id } = {
  PAGE_TITLE_COMPONENT: 'advanced_settings_page_title' as Id,
  PAGE_SUBTITLE_COMPONENT: 'advanced_settings_page_subtitle' as Id,
  PAGE_FOOTER_COMPONENT: 'advanced_settings_page_footer' as Id,
};

type RegistryComponent = ComponentType<Record<string, any> | undefined>;

export class ComponentRegistry {
  static readonly componentType = componentType;
  static readonly defaultRegistry: Record<Id, RegistryComponent> = {
    advanced_settings_page_title: PageTitle,
    advanced_settings_page_subtitle: PageSubtitle,
    advanced_settings_page_footer: PageFooter,
  };

  registry: { [key in Id]?: RegistryComponent } = {};

  setup = {
    componentType: ComponentRegistry.componentType,
    /**
     * Attempts to register the provided component, with the ability to optionally allow
     * the component to override an existing one.
     *
     * If the intent is to override, then `allowOverride` must be set to true, otherwise an exception is thrown.
     *
     * @param id the id of the component to register
     * @param component the component
     * @param allowOverride (default: false) - optional flag to allow this component to override a previously registered component
     */
    register: (id: Id, component: RegistryComponent, allowOverride = false) => {
      if (!allowOverride && id in this.registry) {
        throw new Error(`Component with id ${id} is already registered.`);
      }

      // Setting a display name if one does not already exist.
      // This enhances the snapshots, as well as the debugging experience.
      if (!component.displayName) {
        component.displayName = id;
      }

      this.registry[id] = component;
    },
  };

  start = {
    componentType: ComponentRegistry.componentType,
    /**
     * Retrieve a registered component by its ID.
     * If the component does not exist, then an exception is thrown.
     *
     * @param id the ID of the component to retrieve
     */
    get: (id: Id): RegistryComponent => {
      return this.registry[id] || ComponentRegistry.defaultRegistry[id];
    },
  };
}

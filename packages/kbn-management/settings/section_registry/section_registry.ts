/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ComponentType } from 'react';
import { ToastsStart } from '@kbn/core-notifications-browser';
import { UiSettingsScope } from '@kbn/core-ui-settings-common';

/**
 * Props provided to a `RegistryComponent`.
 */
export interface RegistryComponentProps {
  toasts: ToastsStart;
  enableSaving: Record<UiSettingsScope, boolean>;
}

/**
 * A registry entry for a section.
 */
export interface RegistryEntry {
  Component: RegistryComponent;
  queryMatch: QueryMatchFn;
}

type RegistryComponent = ComponentType<RegistryComponentProps>;
type PageType = 'space' | 'global';
type QueryMatchFn = (term: string) => boolean;
type Registry = Record<PageType, RegistryEntry[]>;

/**
 * A registry of sections to add to pages within Advanced Settings.
 */
export class SectionRegistry {
  private registry: Registry = {
    space: [],
    global: [],
  };

  setup = {
    /**
     * Registers a section within the "Space" page.
     *
     * @param Component - A React component to render.
     * @param queryMatch - A function that, given a search term, returns true if the section should be rendered.
     */
    addSpaceSection: (Component: RegistryComponent, queryMatch: QueryMatchFn) => {
      this.registry.space.push({ Component, queryMatch });
    },

    /**
     * Registers a section within the "Global" page.
     *
     * @param Component - A React component to render.
     * @param queryMatch - A function that, given a search term, returns true if the section should be rendered.
     */
    addGlobalSection: (Component: RegistryComponent, queryMatch: QueryMatchFn) => {
      this.registry.global.push({ Component, queryMatch });
    },
  };

  start = {
    /**
     * Retrieve components registered for the "Space" page.
     */
    getGlobalSections: (): RegistryEntry[] => {
      return this.registry.global;
    },

    /**
     * Retrieve components registered for the "Global" page.
     */
    getSpacesSections: (): RegistryEntry[] => {
      return this.registry.space;
    },
  };
}

/**
 * The `setup` contract provided by a `SectionRegistry`.
 */
export type SectionRegistrySetup = SectionRegistry['setup'];

/**
 * The `start` contract provided by a `SectionRegistry`.
 */
export type SectionRegistryStart = SectionRegistry['start'];

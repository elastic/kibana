/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface ScoutTestableComponent {
  name: string;
  group: string;
  type: 'plugin' | 'package';
  visibility?: 'shared' | 'private';
  root: string;
}

export interface ScoutTestableComponentWithConfigs extends ScoutTestableComponent {
  configs: Omit<ScoutTestConfig, 'component'>[];
}

import { type ScoutTestConfig, testConfigs } from './test_config';

export const testableComponents = {
  get all(): ScoutTestableComponent[] {
    const seenComponents: string[] = [];
    return testConfigs.all.reduce<ScoutTestableComponent[]>((components, config) => {
      if (!seenComponents.includes(config.component.root)) {
        components.push(config.component);
        seenComponents.push(config.component.root);
      }
      return components;
    }, []);
  },

  get allIncludingConfigs(): ScoutTestableComponentWithConfigs[] {
    return this.all.map((component) => ({
      ...component,
      configs: [
        ...testConfigs.forComponent(component.name, component.type).map((config) => ({
          path: config.path,
          category: config.category,
          type: config.type,
          manifest: config.manifest,
        })),
      ],
    }));
  },

  ofType(componentType: ScoutTestableComponent['type']): ScoutTestableComponent[] {
    return testableComponents.all.filter((component) => component.type === componentType);
  },

  get plugins(): ScoutTestableComponent[] {
    return testableComponents.ofType('plugin');
  },

  get packages(): ScoutTestableComponent[] {
    return testableComponents.ofType('package');
  },
};

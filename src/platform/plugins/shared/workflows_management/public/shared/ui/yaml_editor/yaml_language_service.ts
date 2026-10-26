/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type MonacoYaml, type MonacoYamlOptions } from 'monaco-yaml';
import { configureMonacoYamlSchema } from '@kbn/monaco';

// Default options for Monaco YAML
const defaultMonacoYamlOptions: MonacoYamlOptions = {
  completion: true, // Enable schema-based completions from monaco-yaml until we re-implement 'with' block completions in our own provider
  hover: true, // hover is handled by the custom providers
  validate: true, // Keep validation
};

let instance: MonacoYaml | null = null;
let initPromise: Promise<MonacoYaml> | null = null;

/**
 * Service to manage the global monaco-yaml instance.
 * monaco-yaml only supports a single global instance, so we manage it as a singleton.
 * See: https://github.com/remcohaszing/monaco-yaml#usage
 */
export const yamlLanguageService = {
  /**
   * Initialize the monaco-yaml instance with the given schemas and options.
   * If already initialized, returns the existing instance.
   */
  async initialize(
    schemas: MonacoYamlOptions['schemas'] = [],
    options: Partial<MonacoYamlOptions> = {}
  ): Promise<MonacoYaml> {
    if (!initPromise) {
      initPromise = configureMonacoYamlSchema(schemas, {
        ...defaultMonacoYamlOptions,
        ...options,
      }).then((monacoYaml) => {
        instance = monacoYaml;
        return monacoYaml;
      });
    }
    return initPromise;
  },

  /**
   * Update the monaco-yaml instance with new schemas and options.
   * If not initialized, initializes it first.
   */
  async update(
    schemas: MonacoYamlOptions['schemas'] = [],
    options: Partial<MonacoYamlOptions> = {}
  ): Promise<void> {
    if (instance) {
      await instance.update({
        ...defaultMonacoYamlOptions,
        ...options,
        schemas,
      });
    } else {
      await this.initialize(schemas, options);
    }
  },

  /**
   * Clear schemas from the monaco-yaml instance.
   * Keeps the instance alive but removes all schemas.
   */
  async clearSchemas(): Promise<void> {
    if (instance) {
      await instance.update({
        ...defaultMonacoYamlOptions,
        schemas: [],
      });
    }
  },

  /**
   * Dispose of the monaco-yaml instance completely.
   * Should only be called when no YamlEditor components are mounted.
   */
  dispose(): void {
    if (instance) {
      instance.dispose();
      instance = null;
      initPromise = null;
    }
  },

  /**
   * Get the current monaco-yaml instance.
   * Returns null if not initialized.
   */
  getInstance(): MonacoYaml | null {
    return instance;
  },

  /**
   * Check if the service is initialized.
   */
  isInitialized(): boolean {
    return instance !== null;
  },
};

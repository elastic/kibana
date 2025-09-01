/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { merge } from 'lodash';
import type {
  EndpointDescription,
  EndpointDefinition,
  EndpointsAvailability,
  FileSystemAdapter,
  SpecDefinitionsConfig,
  SpecDefinitionsResult,
} from './types';

// Webpack's non-bundled require function
declare const __non_webpack_require__: typeof require;

/**
 * Server-side utility for loading Console spec definitions
 * This allows external consumers to generate spec definitions on their server
 */
export class ConsoleSpecDefinitionsLoader {
  private readonly name = 'es';
  private readonly globalRules: Record<string, any> = {};
  private readonly endpoints: Record<string, EndpointDescription> = {};

  constructor(private config: SpecDefinitionsConfig) {}

  /**
   * Load and merge all spec definitions from JSON and JS files
   * Returns the same format as the Kibana SpecDefinitionsService
   */
  public loadDefinitions(): SpecDefinitionsResult {
    const jsonDefinitions = this.loadJSONDefinitionsFiles();

    // Add all endpoints based on availability
    Object.keys(jsonDefinitions).forEach((endpoint) => {
      const description = jsonDefinitions[endpoint];
      const shouldAddEndpoint = this.shouldAddEndpoint(description);

      if (shouldAddEndpoint) {
        this.addEndpointDescription(endpoint, description);
      }
    });

    // Load JavaScript-based definitions
    this.loadJSDefinitions();

    return this.asJson();
  }

  /**
   * Add global autocomplete rules
   */
  public addGlobalAutocompleteRules(parentNode: string, rules: unknown) {
    this.globalRules[parentNode] = rules;
  }

  /**
   * Add endpoint description
   */
  public addEndpointDescription(endpoint: string, description: EndpointDescription = {}) {
    let copiedDescription: EndpointDescription = {};
    if (this.endpoints[endpoint]) {
      copiedDescription = { ...this.endpoints[endpoint] };
    }

    // Add URL params for index patterns
    let urlParamsDef:
      | {
          ignore_unavailable?: string;
          allow_no_indices?: string;
          expand_wildcards?: string[];
        }
      | undefined;

    const patterns = Array.isArray(description.patterns)
      ? description.patterns
      : description.patterns
      ? [description.patterns]
      : [];

    patterns.forEach((pattern) => {
      if (pattern.indexOf('{index}') >= 0) {
        urlParamsDef = urlParamsDef || {};
        urlParamsDef.ignore_unavailable = '__flag__';
        urlParamsDef.allow_no_indices = '__flag__';
        urlParamsDef.expand_wildcards = ['open', 'closed'];
      }
    });

    if (urlParamsDef) {
      description.url_params = { ...description.url_params, ...copiedDescription.url_params };
      description.url_params = { ...urlParamsDef, ...description.url_params };
    }

    Object.assign(copiedDescription, description);

    // Set defaults
    if (!copiedDescription.patterns) copiedDescription.patterns = [endpoint];
    if (!copiedDescription.methods) copiedDescription.methods = ['GET'];

    this.endpoints[endpoint] = copiedDescription;
  }

  /**
   * Export definitions in the same format as Kibana's SpecDefinitionsService
   */
  public asJson(): SpecDefinitionsResult {
    return {
      name: this.name,
      globals: this.globalRules,
      endpoints: this.endpoints,
    };
  }

  private loadJSONDefinitionsFiles(): Record<string, EndpointDescription> {
    const { fs, definitionsPath, stackVersion } = this.config;

    // Construct the versioned path: {definitionsPath}/{stackVersion}/json
    const versionedPath = fs.join(definitionsPath, stackVersion, 'json');

    // Load files from different folders
    const generatedPattern = fs.normalizePath(fs.join(versionedPath, 'generated', '*.json'));
    const overridePattern = fs.normalizePath(fs.join(versionedPath, 'overrides', '*.json'));
    const manualPattern = fs.normalizePath(fs.join(versionedPath, 'manual', '*.json'));

    const generatedFiles = fs.globSync(generatedPattern);
    const overrideFiles = fs.globSync(overridePattern);
    const manualFiles = fs.globSync(manualPattern);

    const jsonDefinitions: Record<string, EndpointDescription> = {};

    // Load generated files and merge with overrides
    generatedFiles.forEach((file) => {
      const overrideFile = overrideFiles.find((f) => fs.basename(f) === fs.basename(file));
      const loadedDefinition: EndpointDefinition = JSON.parse(fs.readFileSync(file, 'utf8'));

      if (overrideFile) {
        const overrideDefinition: EndpointDefinition = JSON.parse(
          fs.readFileSync(overrideFile, 'utf8')
        );
        merge(loadedDefinition, overrideDefinition);
      }

      this.addToJsonDefinitions({ loadedDefinition, jsonDefinitions });
    });

    // Add manual definitions
    manualFiles.forEach((file) => {
      const loadedDefinition: EndpointDefinition = JSON.parse(fs.readFileSync(file, 'utf8'));
      this.addToJsonDefinitions({ loadedDefinition, jsonDefinitions });
    });

    return jsonDefinitions;
  }

  private addToJsonDefinitions({
    loadedDefinition,
    jsonDefinitions,
  }: {
    loadedDefinition: EndpointDefinition;
    jsonDefinitions: Record<string, EndpointDescription>;
  }) {
    Object.entries(loadedDefinition).forEach(([endpointName, endpointDescription]) => {
      // Handle duplicate endpoint names
      if (jsonDefinitions[endpointName]) {
        jsonDefinitions[`${endpointName}${Date.now()}`] = endpointDescription;
      } else {
        jsonDefinitions[endpointName] = endpointDescription;
      }
    });
  }

  private shouldAddEndpoint(description: EndpointDescription): boolean {
    const { endpointsAvailability = 'stack' } = this.config;

    // If no availability specified, include by default
    if (!description.availability) {
      return true;
    }

    return Boolean(description.availability[endpointsAvailability]);
  }

  private loadJSDefinitions() {
    try {
      const { fs, definitionsPath, stackVersion } = this.config;

      // Look for compiled JavaScript files (TypeScript files are compiled during webpack build)
      const jsIndexPath = fs.join(definitionsPath, stackVersion, 'js', 'index.js');

      // Check if compiled JS file exists
      try {
        fs.readFileSync(jsIndexPath, 'utf8');
      } catch (jsError) {
        console.warn(`No compiled JS definitions found for stack version ${stackVersion}`);
        console.warn(`Expected: ${jsIndexPath}`);
        console.warn(
          'Make sure the webpack build process compiled TypeScript definitions to JavaScript.'
        );
        return;
      }

      // Require the compiled JS definitions file
      // Use __non_webpack_require__ to bypass webpack bundling for dynamic requires
      const jsLoaders = __non_webpack_require__(jsIndexPath);
      const specLoaders = jsLoaders.jsSpecLoaders;

      if (Array.isArray(specLoaders)) {
        specLoaders.forEach((loader: (service: ConsoleSpecDefinitionsLoader) => void) => {
          try {
            loader(this);
          } catch (error) {
            console.error(`Error loading JS spec definition:`, error);
          }
        });
      } else {
        console.warn(`jsSpecLoaders is not an array in the loaded module`);
      }
    } catch (error) {
      console.error('Error loading JS definitions:', error);
    }
  }
}

/**
 * Create a loader with bundled console definitions (Node.js only)
 * This is the simplest way to load definitions - no file system adapter needed
 */
export function createSpecDefinitionsLoader(
  stackVersion: string,
  endpointsAvailability: EndpointsAvailability = 'stack'
): ConsoleSpecDefinitionsLoader {
  const path = require('path');
  const fs = require('fs');
  const glob = require('glob');
  const normalizePath = require('normalize-path');

  // Path to bundled console definitions (relative to this file)
  const definitionsPath = path.join(__dirname, 'console_definitions');

  return new ConsoleSpecDefinitionsLoader({
    definitionsPath,
    stackVersion,
    endpointsAvailability,
    fs: {
      readFileSync: fs.readFileSync,
      globSync: glob.sync,
      normalizePath,
      join: path.join,
      basename: path.basename,
    },
  });
}

/**
 * Create a loader with custom file system adapter
 * Use this for non-Node.js environments or custom file reading logic
 */
export function createSpecDefinitionsLoaderWithAdapter(
  definitionsPath: string,
  stackVersion: string,
  fs: FileSystemAdapter,
  endpointsAvailability: EndpointsAvailability = 'stack'
): ConsoleSpecDefinitionsLoader {
  return new ConsoleSpecDefinitionsLoader({
    definitionsPath,
    stackVersion,
    endpointsAvailability,
    fs,
  });
}

#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable no-console */

import * as fs from 'fs';
import * as path from 'path';
import { merge } from 'lodash';
import globby = require('globby');

type EndpointsAvailability = 'stack' | 'serverless';

interface EndpointAvailability {
  stack?: boolean;
  serverless?: boolean;
}

type UrlParamsValue = string | string[];
type UrlParamsDef = Record<string, UrlParamsValue>;

interface EndpointDescription {
  availability?: EndpointAvailability;
  documentation?: string;
  documentation_serverless?: string;
  id?: string;
  methods?: string[];
  patterns?: string[];
  url_params?: UrlParamsDef;
  [key: string]: unknown;
}

interface SpecDefinitionsJson {
  name: string;
  globals: Record<string, unknown>;
  endpoints: Record<string, EndpointDescription>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseJsonDefinitionFile = (filePath: string): Record<string, EndpointDescription> => {
  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!isRecord(parsed)) {
    throw new Error(`Invalid console definition JSON at ${filePath} (expected an object)`);
  }

  const definitions: Record<string, EndpointDescription> = {};
  for (const [endpointName, endpointDescription] of Object.entries(parsed)) {
    if (!isRecord(endpointDescription)) {
      throw new Error(
        `Invalid console definition for "${endpointName}" in ${filePath} (expected an object)`
      );
    }

    definitions[endpointName] = endpointDescription;
  }

  return definitions;
};

/**
 * Standalone version of SpecDefinitionsService for aggregation script
 */
class StandaloneSpecDefinitionsService {
  name: string;
  versionPath: string;
  globalRules: Record<string, unknown>;
  endpoints: Record<string, EndpointDescription>;
  hasLoadedDefinitions: boolean;

  constructor(versionPath: string) {
    this.name = 'es';
    this.versionPath = versionPath;
    this.globalRules = {};
    this.endpoints = {};
    this.hasLoadedDefinitions = false;
  }

  addGlobalAutocompleteRules(parentNode: string, rules: unknown) {
    this.globalRules[parentNode] = rules;
  }

  addEndpointDescription(
    endpoint: string,
    description: EndpointDescription = {},
    isServerless = false
  ) {
    let copiedDescription: EndpointDescription = {};
    if (this.endpoints[endpoint]) {
      copiedDescription = { ...this.endpoints[endpoint] };
    }

    let urlParamsDef: UrlParamsDef | undefined;
    if (description.patterns) {
      description.patterns.forEach((p) => {
        if (p.indexOf('{index}') >= 0) {
          urlParamsDef = urlParamsDef || {};
          urlParamsDef.ignore_unavailable = '__flag__';
          urlParamsDef.allow_no_indices = '__flag__';
          urlParamsDef.expand_wildcards = ['open', 'closed'];
        }
      });
    }

    if (urlParamsDef) {
      description.url_params = Object.assign(
        description.url_params || {},
        copiedDescription.url_params || {}
      );
      Object.assign(description.url_params, urlParamsDef);
    }

    if (isServerless) {
      const serverlessDocUrl =
        typeof description.documentation_serverless === 'string'
          ? description.documentation_serverless.trim()
          : undefined;
      description.documentation = serverlessDocUrl || 'https://www.elastic.co/docs/api';

      if (!serverlessDocUrl) {
        delete description.documentation_serverless;
      }
    }

    Object.assign(copiedDescription, description);
    Object.assign(copiedDescription, {
      id: endpoint,
      patterns: [endpoint],
      methods: ['GET'],
      ...copiedDescription,
    });

    this.endpoints[endpoint] = copiedDescription;
  }

  asJson(): SpecDefinitionsJson {
    return {
      name: this.name,
      globals: this.globalRules,
      endpoints: this.endpoints,
    };
  }

  loadDefinitions(endpointsAvailability: EndpointsAvailability = 'stack'): SpecDefinitionsJson {
    if (!this.hasLoadedDefinitions) {
      this.loadJsonDefinitions(endpointsAvailability);
      this.loadJSDefinitions();
      this.hasLoadedDefinitions = true;
    }
    return this.asJson();
  }

  loadJsonDefinitions(endpointsAvailability: EndpointsAvailability) {
    const result = this.loadJSONDefinitionsFiles();

    Object.keys(result).forEach((endpoint) => {
      const description = result[endpoint];
      const addEndpoint =
        // If the 'availability' property doesn't exist, display the endpoint by default
        !description.availability ||
        (endpointsAvailability === 'stack' && description.availability.stack === true) ||
        (endpointsAvailability === 'serverless' && description.availability.serverless === true);
      if (addEndpoint) {
        this.addEndpointDescription(endpoint, description, endpointsAvailability === 'serverless');
      }
    });
  }

  loadJSONDefinitionsFiles(): Record<string, EndpointDescription> {
    const jsonPath = path.join(this.versionPath, 'json');
    const generatedPath = path.join(jsonPath, 'generated');
    const overridesPath = path.join(jsonPath, 'overrides');
    const manualPath = path.join(jsonPath, 'manual');

    // Use globby to find files
    const generatedFiles = globby.sync(path.join(generatedPath, '*.json'));
    const overrideFiles = globby.sync(path.join(overridesPath, '*.json'));
    const manualFiles = globby.sync(path.join(manualPath, '*.json'));

    const jsonDefinitions: Record<string, EndpointDescription> = {};

    // Load generated files with overrides
    generatedFiles.forEach((file) => {
      const overrideFile = overrideFiles.find((f) => path.basename(f) === path.basename(file));
      const loadedDefinition = parseJsonDefinitionFile(file);
      if (overrideFile) {
        const overrideDefinition = parseJsonDefinitionFile(overrideFile);
        merge(loadedDefinition, overrideDefinition);
      }
      this.addToJsonDefinitions({ loadedDefinition, jsonDefinitions });
    });

    // Load manual files
    manualFiles.forEach((file) => {
      const loadedDefinition = parseJsonDefinitionFile(file);
      this.addToJsonDefinitions({ loadedDefinition, jsonDefinitions });
    });

    return jsonDefinitions;
  }

  addToJsonDefinitions({
    loadedDefinition,
    jsonDefinitions,
  }: {
    loadedDefinition: Record<string, EndpointDescription>;
    jsonDefinitions: Record<string, EndpointDescription>;
  }) {
    Object.entries(loadedDefinition).forEach(([endpointName, endpointDescription]) => {
      if (jsonDefinitions[endpointName]) {
        // add timestamp to create a unique key
        jsonDefinitions[`${endpointName}${Date.now()}`] = endpointDescription;
      } else {
        jsonDefinitions[endpointName] = endpointDescription;
      }
    });
    return jsonDefinitions;
  }

  loadJSDefinitions() {
    const jsIndexPath = path.join(this.versionPath, 'js', 'index.ts');

    // Check if JS definitions exist
    if (!fs.existsSync(jsIndexPath)) {
      console.log(`No JS definitions found at: ${jsIndexPath}`);
      return;
    }

    try {
      // Load the JS spec loaders
      // Dynamic require is necessary here because the path is determined at runtime based on version directories

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const loadedModule: unknown = require(jsIndexPath);
      const jsSpecLoaders = isRecord(loadedModule) ? loadedModule.jsSpecLoaders : undefined;

      if (!jsSpecLoaders || !Array.isArray(jsSpecLoaders)) {
        console.log(`Invalid jsSpecLoaders export in: ${jsIndexPath}`);
        return;
      }

      // Execute each loader function with this service instance
      jsSpecLoaders.forEach((loader) => {
        if (typeof loader === 'function') {
          loader(this);
        }
      });

      console.log(`✓ Loaded ${jsSpecLoaders.length} JS definition loaders`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      console.error(`Error loading JS definitions from ${jsIndexPath}:`, message);
      console.error('Stack:', stack);
    }
  }
}

/**
 * Main aggregation function
 */
async function generateAggregatedDefinitions() {
  console.log('=== Console API Definitions Aggregator ===');

  const scriptDir = __dirname;
  console.log('Script directory:', scriptDir);

  const consoleDefinitionsDir = path.join(scriptDir, '..', '..', 'console_definitions_target');

  // Check if console_definitions directory exists
  if (!fs.existsSync(consoleDefinitionsDir)) {
    console.error('Console definitions directory not found:', consoleDefinitionsDir);
    console.error('Run generate_console_definitions.sh first to generate version folders');
    process.exit(1);
  }

  // Find all version directories
  const versionDirs = fs
    .readdirSync(consoleDefinitionsDir)
    .filter((item) => {
      const fullPath = path.join(consoleDefinitionsDir, item);
      return fs.statSync(fullPath).isDirectory() && !item.startsWith('.');
    })
    .sort();

  console.log('Found versions:', versionDirs);

  const aggregatedResponse: Record<string, { es: SpecDefinitionsJson }> = {};

  for (const version of versionDirs) {
    const versionPath = path.join(consoleDefinitionsDir, version);
    console.log(`Processing version: ${version}`);

    try {
      const service = new StandaloneSpecDefinitionsService(versionPath);
      const versionDefinitions = service.loadDefinitions('stack');

      aggregatedResponse[version] = {
        es: versionDefinitions,
      };

      console.log(
        `✓ Processed version ${version}: ${
          Object.keys(versionDefinitions.endpoints).length
        } endpoints`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`✗ Error processing version ${version}:`, message);
    }
  }

  // Write individual versioned files to the target directory
  const outputDir = path.join(scriptDir, '..', '..', 'console_definitions_target');
  const generatedFiles: string[] = [];

  Object.entries(aggregatedResponse).forEach(([version, versionData]) => {
    const outputPath = path.join(outputDir, `${version}.json`);

    fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2));
    generatedFiles.push(outputPath);
  });

  // Clean up version folders after successful aggregation
  console.log('Cleaning up version folders...');
  versionDirs.forEach((version) => {
    if (aggregatedResponse[version]) {
      const versionPath = path.join(consoleDefinitionsDir, version);
      try {
        fs.rmSync(versionPath, { recursive: true, force: true });
        console.log(`Removed version folder: ${version}/`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Warning: Could not remove version folder ${version}:`, message);
      }
    }
  });

  console.log('\\n=== Generation Complete ===');
  console.log(`Generated ${generatedFiles.length} versioned definition files:`);

  generatedFiles.forEach((filePath, index) => {
    const version = Object.keys(aggregatedResponse)[index];
    const data = aggregatedResponse[version];
    const endpointCount = Object.keys(data.es.endpoints).length;
    const globalRuleCount = Object.keys(data.es.globals).length;
    console.log(
      `  - ${path.basename(filePath)}: ${endpointCount} endpoints, ${globalRuleCount} global rules`
    );
  });

  console.log('');
  console.log('Versioned definition files are now available at:');
  console.log(outputDir);
  console.log('Look for files like: 9.0.json, 9.1.json, etc.');
}

// Run the script if called directly
if (require.main === module) {
  generateAggregatedDefinitions().catch(console.error);
}

module.exports = { generateAggregatedDefinitions, StandaloneSpecDefinitionsService };

#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('fs');
const path = require('path');
const { merge } = require('lodash');
const globby = require('globby');

/**
 * Standalone version of SpecDefinitionsService for aggregation script
 */
class StandaloneSpecDefinitionsService {
  constructor(versionPath) {
    this.name = 'es';
    this.versionPath = versionPath;
    this.globalRules = {};
    this.endpoints = {};
    this.hasLoadedDefinitions = false;
  }

  addGlobalAutocompleteRules(parentNode, rules) {
    this.globalRules[parentNode] = rules;
  }

  addEndpointDescription(endpoint, description = {}, docsLinkToApiReference = false) {
    let copiedDescription = {};
    if (this.endpoints[endpoint]) {
      copiedDescription = { ...this.endpoints[endpoint] };
    }

    let urlParamsDef;
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
      description.url_params = Object.assign(description.url_params || {}, copiedDescription.url_params);
      Object.assign(description.url_params, urlParamsDef);
    }

    if (docsLinkToApiReference) {
      description.documentation = 'https://www.elastic.co/docs/api';
    }

    Object.assign(copiedDescription, description);
    Object.assign(copiedDescription, {
      id: endpoint,
      patterns: [endpoint],
      methods: ['GET'],
      ...copiedDescription
    });

    this.endpoints[endpoint] = copiedDescription;
  }

  asJson() {
    return {
      name: this.name,
      globals: this.globalRules,
      endpoints: this.endpoints,
    };
  }

  loadDefinitions(endpointsAvailability = 'stack') {
    if (!this.hasLoadedDefinitions) {
      this.loadJsonDefinitions(endpointsAvailability);
      this.loadJSDefinitions();
      this.hasLoadedDefinitions = true;
    }
    return this.asJson();
  }

  loadJsonDefinitions(endpointsAvailability) {
    const result = this.loadJSONDefinitionsFiles();

    Object.keys(result).forEach((endpoint) => {
      const description = result[endpoint];
      const addEndpoint =
        // If the 'availability' property doesn't exist, display the endpoint by default
        !description.availability ||
        (endpointsAvailability === 'stack' && description.availability.stack) ||
        (endpointsAvailability === 'serverless' && description.availability.serverless);
      if (addEndpoint) {
        this.addEndpointDescription(endpoint, description, endpointsAvailability === 'serverless');
      }
    });
  }

  loadJSONDefinitionsFiles() {
    const jsonPath = path.join(this.versionPath, 'json');
    const generatedPath = path.join(jsonPath, 'generated');
    const overridesPath = path.join(jsonPath, 'overrides'); 
    const manualPath = path.join(jsonPath, 'manual');

    // Use globby to find files
    const generatedFiles = globby.sync(path.join(generatedPath, '*.json'));
    const overrideFiles = globby.sync(path.join(overridesPath, '*.json'));
    const manualFiles = globby.sync(path.join(manualPath, '*.json'));

    const jsonDefinitions = {};

    // Load generated files with overrides
    generatedFiles.forEach((file) => {
      const overrideFile = overrideFiles.find((f) => path.basename(f) === path.basename(file));
      const loadedDefinition = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (overrideFile) {
        merge(loadedDefinition, JSON.parse(fs.readFileSync(overrideFile, 'utf8')));
      }
      this.addToJsonDefinitions({ loadedDefinition, jsonDefinitions });
    });

    // Load manual files
    manualFiles.forEach((file) => {
      const loadedDefinition = JSON.parse(fs.readFileSync(file, 'utf8'));
      this.addToJsonDefinitions({ loadedDefinition, jsonDefinitions });
    });

    return jsonDefinitions;
  }

  addToJsonDefinitions({ loadedDefinition, jsonDefinitions }) {
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
    
    // For now, we'll skip JS definitions as they require TypeScript compilation
    // and complex module resolution. This can be added later if needed.
    console.log(`Skipping JS definitions for version folder: ${this.versionPath}`);
  }
}

/**
 * Main aggregation function
 */
async function generateAggregatedDefinitions() {
  const scriptDir = __dirname;
  const consoleDefinitionsDir = path.join(scriptDir, '..', 'server', 'console_definitions');
  
  // Check if console_definitions directory exists
  if (!fs.existsSync(consoleDefinitionsDir)) {
    console.error('Console definitions directory not found:', consoleDefinitionsDir);
    console.error('Run generate_console_definitions.sh first to generate version folders');
    process.exit(1);
  }

  // Find all version directories
  const versionDirs = fs.readdirSync(consoleDefinitionsDir)
    .filter(item => {
      const fullPath = path.join(consoleDefinitionsDir, item);
      return fs.statSync(fullPath).isDirectory() && !item.startsWith('.');
    })
    .sort(); // Sort versions

  console.log('Found versions:', versionDirs);

  const aggregatedResponse = {};

  for (const version of versionDirs) {
    const versionPath = path.join(consoleDefinitionsDir, version);
    console.log(`Processing version: ${version}`);

    try {
      const service = new StandaloneSpecDefinitionsService(versionPath);
      const versionDefinitions = service.loadDefinitions('stack');
      
      aggregatedResponse[version] = {
        es: versionDefinitions
      };

      console.log(`✓ Processed version ${version}: ${Object.keys(versionDefinitions.endpoints).length} endpoints`);
    } catch (error) {
      console.error(`✗ Error processing version ${version}:`, error.message);
      // Continue with other versions
    }
  }

  // Write individual versioned files
  const outputDir = path.join(scriptDir, '..', 'server', 'console_definitions');
  const generatedFiles = [];

  Object.entries(aggregatedResponse).forEach(([version, versionData]) => {
    const outputPath = path.join(outputDir, `${version}.json`);
    
    fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2));
    generatedFiles.push(outputPath);
  });
  
  console.log('\\n=== Generation Complete ===');
  console.log(`Generated ${generatedFiles.length} versioned definition files:`);
  
  // Print summary for each file
  generatedFiles.forEach((filePath, index) => {
    const version = Object.keys(aggregatedResponse)[index];
    const data = aggregatedResponse[version];
    const endpointCount = Object.keys(data.es.endpoints).length;
    const globalRuleCount = Object.keys(data.es.globals).length;
    console.log(`  - ${path.basename(filePath)}: ${endpointCount} endpoints, ${globalRuleCount} global rules`);
  });
}

// Run the script if called directly
if (require.main === module) {
  generateAggregatedDefinitions().catch(console.error);
}

module.exports = { generateAggregatedDefinitions, StandaloneSpecDefinitionsService };
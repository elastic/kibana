#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Build-time script to generate Elasticsearch connector schemas
 * This reads Console definitions and generates static connector data for the browser
 */

const fs = require('fs');
const path = require('path');

// Path to Console definitions
const CONSOLE_DEFINITIONS_PATH = path.resolve(
  __dirname,
  '../../console/server/lib/spec_definitions/json/generated'
);
const OUTPUT_PATH = path.resolve(__dirname, '../common/generated_es_connectors.ts');

console.log('🔧 Generating Elasticsearch connectors from Console definitions...');
console.log(`📁 Reading from: ${CONSOLE_DEFINITIONS_PATH}`);
console.log(`📝 Writing to: ${OUTPUT_PATH}`);

// Check if Console definitions exist
if (!fs.existsSync(CONSOLE_DEFINITIONS_PATH)) {
  console.error('❌ Console definitions not found at:', CONSOLE_DEFINITIONS_PATH);
  console.error('Make sure Console plugin definitions are generated first.');
  process.exit(1);
}

/**
 * Extract path parameters from Console patterns
 */
function extractPathParameters(patterns) {
  const params = new Set();
  for (const pattern of patterns) {
    const matches = pattern.match(/\{([^}]+)\}/g);
    if (matches) {
      for (const match of matches) {
        params.add(match.slice(1, -1));
      }
    }
  }
  return Array.from(params);
}

/**
 * Convert Console url_param to Zod schema definition string
 */
function convertUrlParamToZodString(paramName, paramValue, isRequired = false) {
  const optionalSuffix = isRequired ? '' : '.optional()';
  const requiredMarker = isRequired ? ' (required)' : '';

  if (paramValue === '__flag__') {
    return `z.boolean()${optionalSuffix}.describe('Boolean flag: ${paramName}${requiredMarker}')`;
  }

  if (Array.isArray(paramValue)) {
    if (paramValue.length === 0) {
      return `z.array(z.string())${optionalSuffix}.describe('Array parameter: ${paramName}${requiredMarker}')`;
    }

    // Check if all values are numeric
    if (paramValue.every((val) => !isNaN(Number(val)))) {
      const enumValues = paramValue.map((v) => `'${v}'`).join(', ');
      return `z.union([z.number(), z.array(z.number()), z.enum([${enumValues}])])${optionalSuffix}.describe('Numeric parameter: ${paramName}${requiredMarker}')`;
    }

    // String enum
    const enumValues = paramValue.map((v) => `'${v}'`).join(', ');
    return `z.enum([${enumValues}])${optionalSuffix}.describe('Enum parameter: ${paramName}${requiredMarker}')`;
  }

  if (typeof paramValue === 'string') {
    if (!isNaN(Number(paramValue))) {
      return `z.union([z.string(), z.number()])${optionalSuffix}.describe('Parameter: ${paramName}${requiredMarker}')`;
    }
    return `z.string()${optionalSuffix}.describe('String parameter: ${paramName}${requiredMarker}')`;
  }

  return `z.any()${optionalSuffix}`;
}

/**
 * Determine if a URL parameter should be required based on ES API patterns
 */
function isUrlParamRequired(paramName, endpointName) {
  // Most URL params are optional, but some exceptions exist

  // For bulk operations, some params might be more critical
  if (endpointName.includes('bulk')) {
    return false; // Bulk APIs are generally flexible
  }

  // For search operations, generally all URL params are optional
  if (endpointName.includes('search')) {
    return false;
  }

  // For index operations, some patterns might require certain params
  // but in general, Elasticsearch APIs are designed to be flexible
  // with most URL parameters being optional

  // Conservative approach: only path parameters are required
  return false;
}

/**
 * Generate connector contract for a single ES API
 */
function generateConnectorDefinition(endpointName, definition) {
  const type = `elasticsearch.${endpointName}`;
  const urlParams = definition.url_params || {};
  const patterns = definition.patterns || [];
  const methods = definition.methods || ['GET'];
  const description = `${methods.join('/')} ${patterns.join(' | ') || type} - ${
    Object.keys(urlParams).length
  } parameters`;

  // Build schema object
  const schemaFields = [];

  // Add path parameters (required)
  const pathParams = extractPathParameters(patterns);
  const addedParams = new Set();

  for (const param of pathParams) {
    if (!addedParams.has(param)) {
      schemaFields.push(
        `    ${param}: z.string().describe('Path parameter: ${param} (required)'),`
      );
      addedParams.add(param);
    }
  }

  // Add URL parameters (avoid duplicates with path params)
  for (const [paramName, paramValue] of Object.entries(urlParams)) {
    if (!addedParams.has(paramName)) {
      // Some URL parameters might be considered required based on ES API patterns
      const isRequired = isUrlParamRequired(paramName, endpointName);
      const zodDef = convertUrlParamToZodString(paramName, paramValue, isRequired);
      schemaFields.push(`    ${paramName}: ${zodDef},`);
      addedParams.add(paramName);
    }
  }

  // Add body parameter
  schemaFields.push(`    body: z.any().optional().describe('Request body'),`);

  return `  {
    type: '${type}',
    connectorIdRequired: false,
    description: '${description}',
    paramsSchema: z.object({
${schemaFields.join('\n')}
    }),
    outputSchema: z.any().describe('Response from ${endpointName} API'),
  }`;
}

/**
 * Main generation function
 */
function generateElasticsearchConnectors() {
  try {
    const files = fs.readdirSync(CONSOLE_DEFINITIONS_PATH).filter((file) => file.endsWith('.json'));
    console.log(`📊 Found ${files.length} Console definition files`);

    const connectorDefinitions = [];
    let successCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        const filePath = path.join(CONSOLE_DEFINITIONS_PATH, file);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        for (const [endpointName, definition] of Object.entries(content)) {
          const connectorDef = generateConnectorDefinition(endpointName, definition);
          connectorDefinitions.push(connectorDef);
          successCount++;
        }
      } catch (error) {
        console.warn(`⚠️  Failed to process ${file}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`✅ Successfully processed ${successCount} API definitions`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} files had errors`);
    }

    // Generate the TypeScript file
    const fileContent = `/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 * 
 * This file contains Elasticsearch connector definitions generated from Console's API specifications.
 * Generated at: ${new Date().toISOString()}
 * Source: Console definitions (${successCount} APIs)
 * 
 * To regenerate: npm run generate:es-connectors
 */

import { z } from '@kbn/zod';
import type { ConnectorContract } from '@kbn/workflows';

export const GENERATED_ELASTICSEARCH_CONNECTORS: ConnectorContract[] = [
${connectorDefinitions.join(',\n')}
];

export const ELASTICSEARCH_CONNECTOR_COUNT = ${successCount};
`;

    fs.writeFileSync(OUTPUT_PATH, fileContent, 'utf8');
    console.log(`📝 Generated ${OUTPUT_PATH}`);
    console.log(`🎉 Successfully generated ${successCount} Elasticsearch connectors!`);

    return { success: true, count: successCount };
  } catch (error) {
    console.error('❌ Error generating connectors:', error);
    process.exit(1);
  }
}

// Run the generator
if (require.main === module) {
  generateElasticsearchConnectors();
}

module.exports = { generateElasticsearchConnectors };

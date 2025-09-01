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
 * Clean script to generate Kibana connector schemas from OpenAPI specifications
 * Uses openapi-zod-client to generate proper Zod schemas and then extracts them
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const KIBANA_OPENAPI_PATH = './oas_docs/output/kibana.yaml';
const TEMP_CLIENT_PATH = './client.ts';
const OUTPUT_PATH = path.resolve(__dirname, '../common/generated_kibana_connectors.ts');

console.log('🔧 Generating Kibana connectors using openapi-zod-client...');

/**
 * Generate the client using openapi-zod-client
 */
function generateZodClient() {
  console.log('📦 Running openapi-zod-client...');
  
  try {
    execSync(`npx openapi-zod-client "${KIBANA_OPENAPI_PATH}" -o "${TEMP_CLIENT_PATH}"`, {
      stdio: 'inherit'
    });
    console.log('✅ Generated Zod client successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to generate Zod client:', error.message);
    return false;
  }
}

/**
 * Extract endpoint information from the generated client
 */
function extractEndpoints() {
  console.log('🔍 Extracting endpoints from generated client...');
  
  if (!fs.existsSync(TEMP_CLIENT_PATH)) {
    console.error('❌ Generated client file not found');
    return [];
  }
  
  try {
    const clientContent = fs.readFileSync(TEMP_CLIENT_PATH, 'utf8');
    // Look for the endpoints array in the generated client
    // Pattern: const endpoints = makeApi([...]);
    const endpointsMatch = clientContent.match(/const endpoints = makeApi\(\[([\s\S]*?)\]\);/);
    
    if (!endpointsMatch) {
      console.warn('⚠️  Could not find endpoints array in generated client');
      return [];
    }
    
    const endpointsContent = endpointsMatch[1];
    
    // Extract individual endpoint objects more carefully
    // We need to find complete endpoint objects with proper bracket matching
    const endpoints = [];
    let braceCount = 0;
    let currentEndpoint = '';
    let inEndpoint = false;
    
    for (let i = 0; i < endpointsContent.length; i++) {
      const char = endpointsContent[i];
      
      if (char === '{') {
        if (!inEndpoint) {
          inEndpoint = true;
          currentEndpoint = '';
        }
        braceCount++;
      }
      
      if (inEndpoint) {
        currentEndpoint += char;
      }
      
      if (char === '}') {
        braceCount--;
        if (braceCount === 0 && inEndpoint) {
          // We have a complete endpoint object
          const methodMatch = currentEndpoint.match(/method:\s*['"](\w+)['"]/);
          const pathMatch = currentEndpoint.match(/path:\s*['"]([^'"]+)['"]/);
          const aliasMatch = currentEndpoint.match(/alias:\s*['"]([^'"]+)['"]/);
          
          if (methodMatch && pathMatch && aliasMatch) {
            const method = methodMatch[1];
            const path = pathMatch[2];
            const operationId = aliasMatch[1];
            
            // Look for body parameter schema
            let bodySchema = null;
            const bodyMatch = currentEndpoint.match(/name:\s*['"]body['"],[\s\S]*?schema:\s*([A-Za-z_][A-Za-z0-9_]*)/);
            if (bodyMatch) {
              bodySchema = bodyMatch[1];
            }
            
            endpoints.push({
              method,
              path,
              operationId,
              bodySchema
            });
          }
          
          inEndpoint = false;
          currentEndpoint = '';
        }
      }
    }
    
    console.log(`📋 Extracted ${endpoints.length} endpoints`);
    return endpoints;
  } catch (error) {
    console.error('❌ Failed to extract endpoints:', error.message);
    return [];
  }
}

/**
 * Extract schema definitions from the generated client
 */
function extractSchemas() {
  console.log('🔍 Extracting schemas from generated client...');
  
  try {
    const clientContent = fs.readFileSync(TEMP_CLIENT_PATH, 'utf8');
    const schemas = {};
    
    // Use a more robust regex-based approach to extract complete schema definitions
    // This handles multi-line schemas with the 's' flag to make . match newlines
    const schemaRegex = /const ([A-Za-z_][A-Za-z0-9_]*) = z.*?;/gs;
    
    let match;
    while ((match = schemaRegex.exec(clientContent)) !== null) {
      const schemaName = match[1];
      const schemaDefinition = match[0];
      schemas[schemaName] = schemaDefinition;
    }
    
    console.log(`📋 Extracted ${Object.keys(schemas).length} schemas`);
    
    // Debug: Check if Cases_create_case_request is in our extracted schemas
    if (schemas['Cases_create_case_request']) {
      console.log('✅ Cases_create_case_request found in extracted schemas');
    } else {
      console.log('❌ Cases_create_case_request NOT found in extracted schemas');
      console.log('Cases schemas found:', Object.keys(schemas).filter(s => s.includes('Cases')).slice(0, 10));
    }
    return schemas;
  } catch (error) {
    console.error('❌ Failed to extract schemas:', error.message);
    return {};
  }
}

/**
 * Generate a ConnectorContract for an endpoint
 */
function generateConnector(endpoint, schemas) {
  const type = `kibana.${endpoint.operationId}`;
  
  // Determine the parameter schema
  let paramsSchema;
  if (endpoint.bodySchema && schemas[endpoint.bodySchema]) {
    paramsSchema = endpoint.bodySchema;
    console.log(`✅ Using schema ${endpoint.bodySchema} for ${type}`);
  } else if (endpoint.bodySchema) {
    console.warn(`⚠️  Schema ${endpoint.bodySchema} not found for ${type}, using z.any()`);
    console.warn(`   Available schemas: ${Object.keys(schemas).slice(0, 5).join(', ')}...`);
    paramsSchema = 'z.any()';
  } else {
    paramsSchema = 'z.object({})';
  }
  
  const description = `API endpoint: ${endpoint.method.toUpperCase()} ${endpoint.path}`;
  
  return `  {
    type: '${type}',
    connectorIdRequired: false,
    paramsSchema: ${paramsSchema},
    outputSchema: z.any().describe('${description}'),
  }`;
}

/**
 * Collect all schemas that are referenced (including nested references)
 */
function collectUsedSchemas(endpoints, allSchemas) {
  const usedSchemas = new Set();
  
  function addSchema(schemaName) {
    if (!schemaName || usedSchemas.has(schemaName) || !allSchemas[schemaName]) {
      return;
    }
    
    usedSchemas.add(schemaName);
    
    // Find references to other schemas in this schema definition
    const schemaDefinition = allSchemas[schemaName];
    const references = schemaDefinition.match(/[A-Za-z_][A-Za-z0-9_]*(?=\s*(?:,|\)|\}|\.|\[))/g) || [];
    
    for (const ref of references) {
      if (allSchemas[ref] && ref !== schemaName) {
        addSchema(ref);
      }
    }
  }
  
  // Add schemas used by endpoints
  for (const endpoint of endpoints) {
    if (endpoint.bodySchema) {
      addSchema(endpoint.bodySchema);
    }
  }
  
  return usedSchemas;
}

/**
 * Generate the final TypeScript file
 */
function generateOutputFile(endpoints, schemas) {
  console.log('📝 Generating output file...');
  
  // Collect used schemas
  const usedSchemas = collectUsedSchemas(endpoints, schemas);
  console.log(`📋 Using ${usedSchemas.size} schemas`);
  
  // Generate schema definitions
  const schemaDefinitions = Array.from(usedSchemas)
    .map(schemaName => schemas[schemaName])
    .filter(Boolean)
    .join('\n\n');
  
  // Generate connector definitions
  const connectorDefinitions = endpoints.map(endpoint => 
    generateConnector(endpoint, schemas)
  );
  
  const fileContent = `/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * GENERATED FILE - DO NOT EDIT
 * 
 * This file is automatically generated from Kibana's OpenAPI specifications.
 * To update it, run: node src/platform/plugins/shared/workflows_management/scripts/generate_kibana_connectors_new.js
 */

import { z } from '@kbn/zod';
import type { ConnectorContract } from '@kbn/workflows';

// Schema definitions from OpenAPI spec
${schemaDefinitions}

export const GENERATED_KIBANA_CONNECTORS: ConnectorContract[] = [
${connectorDefinitions.join(',\n')}
];

export const KIBANA_CONNECTOR_COUNT = ${endpoints.length};
`;

  fs.writeFileSync(OUTPUT_PATH, fileContent);
  console.log(`✅ Generated ${OUTPUT_PATH}`);
  console.log(`🎉 Successfully generated ${endpoints.length} Kibana connectors!`);
}

/**
 * Clean up temporary files
 */
function cleanup() {
  if (fs.existsSync(TEMP_CLIENT_PATH)) {
    fs.unlinkSync(TEMP_CLIENT_PATH);
    console.log('🧹 Cleaned up temporary files');
  }
}

/**
 * Main function
 */
function main() {
  try {
    // Step 1: Generate the Zod client
    if (!generateZodClient()) {
      return;
    }
    
    // Step 2: Extract endpoints and schemas
    const endpoints = extractEndpoints();
    const schemas = extractSchemas();
    
    if (endpoints.length === 0) {
      console.error('❌ No endpoints found, cannot generate connectors');
      return;
    }
    
    // Step 3: Generate the output file
    generateOutputFile(endpoints, schemas);
    
    // Step 4: Clean up
    cleanup();
    
  } catch (error) {
    console.error('❌ Failed to generate connectors:', error);
    cleanup();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };

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
 * Build-time script to generate Kibana connector schemas from OpenAPI spec
 * This reads the Kibana OpenAPI spec and generates static connector data for the browser
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths
const KIBANA_OPENAPI_SPEC_PATH = path.resolve(__dirname, '../../../../../../oas_docs/output/kibana.yaml');
const OUTPUT_PATH = path.resolve(__dirname, '../common/generated_kibana_connectors.ts');
const TEMP_OUTPUT_PATH = path.resolve(__dirname, '../common/temp_kibana_api.ts');

console.log('🔧 Generating Kibana connectors from OpenAPI spec...');
console.log(`📁 Reading from: ${KIBANA_OPENAPI_SPEC_PATH}`);
console.log(`📝 Writing to: ${OUTPUT_PATH}`);

// Check if OpenAPI spec exists
if (!fs.existsSync(KIBANA_OPENAPI_SPEC_PATH)) {
  console.error('❌ Kibana OpenAPI spec not found at:', KIBANA_OPENAPI_SPEC_PATH);
  console.error('Make sure the OpenAPI spec is generated first by running: cd oas_docs && npm run build');
  process.exit(1);
}

/**
 * Check if openapi-zod-client is available and install if needed
 */
function ensureOpenapiZodClient() {
  try {
    // Check if openapi-zod-client is available globally or via npx
    execSync('npx openapi-zod-client --version', { stdio: 'pipe' });
    console.log('✅ openapi-zod-client is available');
  } catch (error) {
    console.log('📦 Installing openapi-zod-client...');
    try {
      // Install via npx which will download it temporarily
      execSync('npm install -g openapi-zod-client@latest', { stdio: 'inherit' });
      console.log('✅ openapi-zod-client installed successfully');
    } catch (installError) {
      console.error('❌ Failed to install openapi-zod-client:', installError.message);
      console.error('Please install it manually: npm install -g openapi-zod-client');
      process.exit(1);
    }
  }
}

/**
 * Generate API client using openapi-zod-client CLI
 */
function generateApiClient() {
  try {
    console.log('🔄 Generating API client from OpenAPI spec...');
    
    // Use openapi-zod-client CLI to generate TypeScript client
    const command = `npx openapi-zod-client@latest "${KIBANA_OPENAPI_SPEC_PATH}" -o "${TEMP_OUTPUT_PATH}" --export-schemas --success-expr "status >= 200 && status < 300"`;
    console.log(`Running: ${command}`);
    
    execSync(command, { stdio: 'inherit' });
    console.log('✅ API client generated successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to generate API client:', error.message);
    return false;
  }
}

/**
 * Extract endpoint information from generated file
 */
function extractEndpointInfo(content) {
  const endpoints = [];
  
  // Look for makeApi calls in the generated content from openapi-zod-client
  const makeApiMatch = content.match(/const endpoints = makeApi\(\[([\s\S]*?)\]\);/);
  if (!makeApiMatch) {
    console.warn('⚠️  No makeApi call found in generated content');
    return endpoints;
  }
  
  const endpointArrayContent = makeApiMatch[1];
  
  // Split by objects more carefully, looking for complete endpoint objects
  const endpointObjects = [];
  let currentObject = '';
  let braceDepth = 0;
  let inObject = false;
  
  const lines = endpointArrayContent.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for opening braces
    const openBraces = (trimmed.match(/\{/g) || []).length;
    const closeBraces = (trimmed.match(/\}/g) || []).length;
    
    if (openBraces > 0 && !inObject) {
      // Start of new object
      inObject = true;
      currentObject = line;
      braceDepth = openBraces - closeBraces;
    } else if (inObject) {
      currentObject += '\n' + line;
      braceDepth += openBraces - closeBraces;
      
      // Check if we've closed the object
      if (braceDepth === 0) {
        endpointObjects.push(currentObject);
        currentObject = '';
        inObject = false;
      }
    }
  }
  
  // Parse each endpoint object
  for (const endpointObj of endpointObjects) {
    try {
      const methodMatch = endpointObj.match(/method:\s*['"]([^'"]+)['"]/);
      const pathMatch = endpointObj.match(/path:\s*['"]([^'"]+)['"]/);
      const aliasMatch = endpointObj.match(/alias:\s*['"]([^'"]+)['"]/);
      
      if (methodMatch && pathMatch) {
        const method = methodMatch[1].toUpperCase();
        const path = pathMatch[1];
        const alias = aliasMatch ? aliasMatch[1] : null;
        
        // Create a clean operation ID from alias or generate one
        let operationId;
        if (alias) {
          operationId = alias.replace(/[^a-zA-Z0-9]/g, '_');
        } else {
          operationId = `${method.toLowerCase()}${path
            .replace(/\/api\//, '_')
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')}`;
        }
        
        // Extract parameters information
        const parametersMatch = endpointObj.match(/parameters:\s*\[([\s\S]*?)\]/);
        const parameters = [];
        
        if (parametersMatch) {
          const paramContent = parametersMatch[1];
          // Simple parsing of parameter objects
          const paramMatches = paramContent.match(/\{[\s\S]*?\}/g);
          if (paramMatches) {
            for (const paramMatch of paramMatches) {
              const nameMatch = paramMatch.match(/name:\s*['"]([^'"]+)['"]/);
              const typeMatch = paramMatch.match(/type:\s*['"]([^'"]+)['"]/);
              if (nameMatch && typeMatch) {
                parameters.push({
                  name: nameMatch[1],
                  type: typeMatch[1]
                });
              }
            }
          }
        }
        
        endpoints.push({
          method,
          path,
          operationId,
          alias,
          parameters,
          rawContent: endpointObj
        });
      }
    } catch (error) {
      console.warn('⚠️  Failed to parse endpoint:', error.message);
    }
  }
  
  return endpoints;
}

/**
 * Convert Kibana API endpoint to connector definition
 */
function convertToConnectorDefinition(endpoint, index) {
  const { method, path, operationId, parameters = [] } = endpoint;
  
  // Categorize parameters by type
  const pathParams = [];
  const queryParams = [];
  const headerParams = [];
  const bodyParams = [];
  
  for (const param of parameters) {
    switch (param.type) {
      case 'Path':
        pathParams.push(param.name);
        break;
      case 'Query':
        queryParams.push(param.name);
        break;
      case 'Header':
        headerParams.push(param.name);
        break;
      case 'Body':
        bodyParams.push(param.name);
        break;
    }
  }
  
  // Also extract path params from URL pattern as backup
  const pathParamMatches = path.match(/:([^\/]+)/g);
  if (pathParamMatches) {
    for (const match of pathParamMatches) {
      const paramName = match.slice(1);
      if (!pathParams.includes(paramName)) {
        pathParams.push(paramName);
      }
    }
  }
  
  // Generate schema fields
  const schemaFields = [];
  
  // Helper function to safely quote parameter names if needed
  const safeParamName = (param) => {
    // If parameter name contains special characters, quote it
    if (/[^a-zA-Z0-9_$]/.test(param)) {
      return `'${param}'`;
    }
    return param;
  };

  // Add path parameters (always required)
  for (const param of pathParams) {
    schemaFields.push(`    ${safeParamName(param)}: z.string().describe('Path parameter: ${param} (required)'),`);
  }
  
  // Add query parameters (optional)
  for (const param of queryParams) {
    schemaFields.push(`    ${safeParamName(param)}: z.any().optional().describe('Query parameter: ${param}'),`);
  }
  
  // Add header parameters (usually required but make optional for flexibility)
  for (const param of headerParams) {
    schemaFields.push(`    ${safeParamName(param)}: z.string().optional().describe('Header parameter: ${param}'),`);
  }
  
  // Add body for non-GET requests
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    if (bodyParams.length > 0) {
      for (const param of bodyParams) {
        schemaFields.push(`    ${safeParamName(param)}: z.any().optional().describe('Body parameter: ${param}'),`);
      }
    } else {
      schemaFields.push(`    body: z.any().optional().describe('Request body'),`);
      bodyParams.push('body');
    }
  }
  
  // If no specific query params found but it's a GET request, add generic query support
  if (method === 'GET' && queryParams.length === 0) {
    schemaFields.push(`    query: z.record(z.any()).optional().describe('Query parameters'),`);
    queryParams.push('query');
  }
  
  // Determine connector type
  const type = `kibana.${operationId}`;
  
  // Create description
  const description = `${method} ${path} - Kibana API endpoint`;
  
  // Convert Zodios path format (:param) to our pattern format ({param})
  const pattern = path.replace(/:([^\/]+)/g, '{$1}');
  
  return `  {
    type: '${type}',
    connectorIdRequired: false,
    description: '${description}',
    methods: ["${method}"],
    patterns: ["${pattern}"],
    isInternal: true,
    parameterTypes: {
      pathParams: ${JSON.stringify(pathParams)},
      urlParams: ${JSON.stringify([...queryParams, ...headerParams])},
      bodyParams: ${JSON.stringify(bodyParams)}
    },
    paramsSchema: z.object({
${schemaFields.join('\n')}
    }),
    outputSchema: z.any().describe('Response from ${operationId} API'),
  }`;
}

/**
 * Generate Kibana connectors from the temporary API client file
 */
function generateKibanaConnectors() {
  try {
    if (!fs.existsSync(TEMP_OUTPUT_PATH)) {
      console.error('❌ Temporary API client file not found');
      return { success: false, count: 0 };
    }
    
    // Read the generated content
    const content = fs.readFileSync(TEMP_OUTPUT_PATH, 'utf8');
    
    // Extract endpoint information
    const endpoints = extractEndpointInfo(content);
    console.log(`📊 Found ${endpoints.length} Kibana API endpoints`);
    
    if (endpoints.length === 0) {
      console.warn('⚠️  No endpoints found in generated content');
      return { success: false, count: 0 };
    }
    
    // Generate connector definitions
    const connectorDefinitions = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const endpoint of endpoints) {
      try {
        const connectorDef = convertToConnectorDefinition(endpoint, successCount);
        connectorDefinitions.push(connectorDef);
        successCount++;
      } catch (error) {
        console.warn(`⚠️  Failed to process endpoint ${endpoint.path}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`✅ Successfully processed ${successCount} API endpoints`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} endpoints had errors`);
    }
    
    // Generate the TypeScript file
    const fileContent = `/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 * 
 * This file contains Kibana connector definitions generated from the Kibana OpenAPI specification.
 * Generated at: ${new Date().toISOString()}
 * Source: Kibana OpenAPI spec (${successCount} APIs)
 * 
 * To regenerate: npm run generate:kibana-connectors
 */

import { z } from '@kbn/zod';
import type { InternalConnectorContract } from '@kbn/workflows';

export const GENERATED_KIBANA_CONNECTORS: InternalConnectorContract[] = [
${connectorDefinitions.join(',\n')}
];

export const KIBANA_CONNECTOR_COUNT = ${successCount};
`;
    
    fs.writeFileSync(OUTPUT_PATH, fileContent, 'utf8');
    console.log(`📝 Generated ${OUTPUT_PATH}`);
    console.log(`🎉 Successfully generated ${successCount} Kibana connectors!`);
    
    return { success: true, count: successCount };
  } catch (error) {
    console.error('❌ Error generating connectors:', error);
    return { success: false, count: 0 };
  }
}

/**
 * Cleanup temporary files
 */
function cleanup() {
  try {
    if (fs.existsSync(TEMP_OUTPUT_PATH)) {
      fs.unlinkSync(TEMP_OUTPUT_PATH);
      console.log('🧹 Cleaned up temporary files');
    }
  } catch (error) {
    console.warn('⚠️  Failed to cleanup temporary files:', error.message);
  }
}

/**
 * Main generation function
 */
function generateKibanaConnectorsMain() {
  try {
    // Ensure openapi-zod-client is available
    ensureOpenapiZodClient();
    
    // Generate API client from OpenAPI spec
    const clientGenerated = generateApiClient();
    if (!clientGenerated) {
      process.exit(1);
    }
    
    // Convert to connector format
    const result = generateKibanaConnectors();
    
    // Cleanup
    cleanup();
    
    if (!result.success) {
      process.exit(1);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error in main generation function:', error);
    cleanup();
    process.exit(1);
  }
}

// Run the generator
if (require.main === module) {
  generateKibanaConnectorsMain();
}

module.exports = { generateKibanaConnectorsMain };

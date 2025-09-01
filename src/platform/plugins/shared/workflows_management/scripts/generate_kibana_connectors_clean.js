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
const { execSync } = require('child_process');

const KIBANA_OPENAPI_PATH = './oas_docs/output/kibana.yaml';
const TEMP_CLIENT_PATH = './temp_kibana_client.js';
const OUTPUT_PATH = path.resolve(__dirname, '../common/generated_kibana_connectors.ts');

console.log('🔧 Generating Kibana connectors using openapi-zod-client...');

function main() {
  try {
    // Generate the client to a .js file to avoid TypeScript issues
    console.log('📦 Running openapi-zod-client...');
    execSync(`npx openapi-zod-client "${KIBANA_OPENAPI_PATH}" -o "${TEMP_CLIENT_PATH}"`, {
      stdio: 'inherit'
    });
    
    // Import the generated module dynamically
    console.log('📖 Loading generated client...');
    delete require.cache[path.resolve(TEMP_CLIENT_PATH)];
    const clientModule = require(path.resolve(TEMP_CLIENT_PATH));
    
    // Extract schemas and endpoints
    const schemas = clientModule.schemas || {};
    const endpoints = extractEndpointsFromModule(TEMP_CLIENT_PATH);
    
    console.log(`📋 Found ${Object.keys(schemas).length} schemas and ${endpoints.length} endpoints`);
    
    // Generate ConnectorContract definitions
    const connectorDefinitions = [];
    for (const endpoint of endpoints) {
      const connector = createConnectorContract(endpoint, schemas);
      if (connector) {
        connectorDefinitions.push(connector);
      }
    }
    
    // Create schema definitions text
    const schemaDefinitions = Object.entries(schemas)
      .map(([name, schema]) => `const ${name} = ${schema.toString()};`)
      .join('\n\n');
    
    // Generate the final file
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
 */

import { z } from '@kbn/zod';
import type { ConnectorContract } from '@kbn/workflows';

// Schema definitions
${schemaDefinitions}

export const GENERATED_KIBANA_CONNECTORS: ConnectorContract[] = [
${connectorDefinitions.join(',\n')}
];

export const KIBANA_CONNECTOR_COUNT = ${connectorDefinitions.length};
`;

    fs.writeFileSync(OUTPUT_PATH, fileContent);
    console.log(`✅ Generated ${OUTPUT_PATH}`);
    console.log(`🎉 Successfully generated ${connectorDefinitions.length} Kibana connectors!`);
    
    // Cleanup
    if (fs.existsSync(TEMP_CLIENT_PATH)) {
      fs.unlinkSync(TEMP_CLIENT_PATH);
    }
    
  } catch (error) {
    console.error('❌ Failed to generate connectors:', error);
    
    // Try simple file-based approach as fallback
    return generateFromFile();
  }
}

/**
 * Fallback: generate using simple text-based parsing
 */
function generateFromFile() {
  try {
    console.log('🔄 Falling back to file-based parsing...');
    
    // Generate to TypeScript file for parsing
    execSync(`npx openapi-zod-client "${KIBANA_OPENAPI_PATH}" -o "${TEMP_CLIENT_PATH.replace('.js', '.ts')}"`, {
      stdio: 'ignore'
    });
    
    const clientContent = fs.readFileSync(TEMP_CLIENT_PATH.replace('.js', '.ts'), 'utf8');
    
    // Extract just the schema definitions (const Name = z.object...)
    const schemaMatches = clientContent.match(/^const ([A-Za-z_][A-Za-z0-9_]*) = z\.[\s\S]*?;$/gm) || [];
    
    // Extract endpoints from the makeApi call
    const endpointsMatch = clientContent.match(/const endpoints = makeApi\(\[([\s\S]*?)\]\);/);
    if (!endpointsMatch) {
      throw new Error('Could not find endpoints in generated client');
    }
    
    const endpoints = parseEndpointsSimple(endpointsMatch[1]);
    
    // Generate connectors
    const connectorDefinitions = [];
    for (const endpoint of endpoints) {
      const type = `kibana.${endpoint.alias}`;
      const description = `API endpoint: ${endpoint.method.toUpperCase()} ${endpoint.path}`;
      
      // Determine params schema
      let paramsSchema = 'z.object({})';
      if (endpoint.bodySchema) {
        paramsSchema = endpoint.bodySchema;
      } else if (endpoint.queryParams && endpoint.queryParams.length > 0) {
        const params = endpoint.queryParams.map(p => `"${p.name}": ${p.schema}`).join(', ');
        paramsSchema = `z.object({ ${params} })`;
      }
      
      connectorDefinitions.push(`  {
    type: '${type}',
    connectorIdRequired: false,
    paramsSchema: ${paramsSchema},
    outputSchema: z.any().describe('${description}'),
  }`);
    }
    
    // Create the final file with just the needed schemas
    const usedSchemas = new Set();
    endpoints.forEach(e => {
      if (e.bodySchema && e.bodySchema !== 'z.object({})' && e.bodySchema !== 'z.any()') {
        usedSchemas.add(e.bodySchema);
      }
    });
    
    const relevantSchemas = schemaMatches.filter(schema => {
      const name = schema.match(/^const ([A-Za-z_][A-Za-z0-9_]*) =/)?.[1];
      return name && usedSchemas.has(name);
    });
    
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
 */

import { z } from '@kbn/zod';
import type { ConnectorContract } from '@kbn/workflows';

// Schema definitions
${relevantSchemas.join('\n\n')}

export const GENERATED_KIBANA_CONNECTORS: ConnectorContract[] = [
${connectorDefinitions.join(',\n')}
];

export const KIBANA_CONNECTOR_COUNT = ${connectorDefinitions.length};
`;

    fs.writeFileSync(OUTPUT_PATH, fileContent);
    console.log(`✅ Generated ${OUTPUT_PATH}`);
    console.log(`🎉 Successfully generated ${connectorDefinitions.length} Kibana connectors!`);
    
    // Cleanup
    if (fs.existsSync(TEMP_CLIENT_PATH.replace('.js', '.ts'))) {
      fs.unlinkSync(TEMP_CLIENT_PATH.replace('.js', '.ts'));
    }
    
  } catch (error) {
    console.error('❌ Fallback approach also failed:', error);
    process.exit(1);
  }
}

/**
 * Extract endpoints from the makeApi array content
 */
function parseEndpointsSimple(content) {
  const endpoints = [];
  
  // Very simple regex-based parsing for the examples
  const endpointRegex = /\{\s*method:\s*["'](\w+)["'],\s*path:\s*["']([^"']+)["'],\s*alias:\s*["']([^"']+)["'][\s\S]*?\}/g;
  
  let match;
  while ((match = endpointRegex.exec(content)) !== null) {
    const endpointStr = match[0];
    const method = match[1];
    const path = match[2];
    const alias = match[3];
    
    // Extract body schema if present
    let bodySchema = null;
    const bodyMatch = endpointStr.match(/name:\s*["']body["'][\s\S]*?schema:\s*([A-Za-z_][A-Za-z0-9_]*)/);
    if (bodyMatch) {
      bodySchema = bodyMatch[1];
    }
    
    // Extract query parameters
    const queryParams = [];
    const paramRegex = /\{\s*name:\s*["']([^"']+)["'],\s*type:\s*["']Query["'][\s\S]*?schema:\s*([^,}]+)/g;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(endpointStr)) !== null) {
      queryParams.push({
        name: paramMatch[1],
        schema: paramMatch[2].trim()
      });
    }
    
    endpoints.push({
      method,
      path,
      alias,
      bodySchema,
      queryParams
    });
  }
  
  return endpoints;
}

/**
 * Extract endpoints from the generated module (unused for now)
 */
function extractEndpointsFromModule(clientPath) {
  // This would be used if we could import the module successfully
  return [];
}

/**
 * Create ConnectorContract from endpoint and schemas (unused for now)
 */
function createConnectorContract(endpoint, schemas) {
  // This would be used if we could import the module successfully
  return null;
}

if (require.main === module) {
  main();
}

module.exports = { main };

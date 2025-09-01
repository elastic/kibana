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
 * MINIMAL approach: Generate Kibana connectors with proper schemas
 * Following the openapi-zod-client library example pattern
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const KIBANA_OPENAPI_PATH = './oas_docs/output/kibana.yaml';
const OUTPUT_PATH = path.resolve(__dirname, '../common/generated_kibana_connectors.ts');

console.log('🔧 Generating Kibana connectors (minimal approach)...');

function main() {
  try {
    // Step 1: Generate temp client
    console.log('📦 Running openapi-zod-client...');
    const tempPath = './temp_client.ts';
    execSync(`npx openapi-zod-client "${KIBANA_OPENAPI_PATH}" -o "${tempPath}"`, {
      stdio: 'inherit'
    });
    
    const content = fs.readFileSync(tempPath, 'utf8');
    
    // Step 2: Extract what we need
    console.log('🔍 Extracting schemas and endpoints...');
    
    // Get all schema definitions (const Name = z.object...)
    const schemas = extractAllSchemas(content);
    console.log(`Found ${schemas.length} schema definitions`);
    
    // Get endpoints with their details
    const endpoints = extractEndpoints(content);
    console.log(`Found ${endpoints.length} endpoints`);
    
    // Step 3: Create connectors
    const connectors = endpoints.map(endpoint => createConnector(endpoint, schemas));
    
    // Step 4: Only include schemas that are actually used
    const usedSchemaNames = new Set();
    endpoints.forEach(endpoint => {
      if (endpoint.bodySchema && !endpoint.bodySchema.startsWith('z.')) {
        usedSchemaNames.add(endpoint.bodySchema);
        // Also add dependencies of this schema
        addSchemaDependencies(endpoint.bodySchema, schemas, usedSchemaNames);
      }
    });
    
    const usedSchemas = schemas.filter(schema => {
      const name = schema.match(/^const ([A-Za-z_][A-Za-z0-9_]*) =/)?.[1];
      return name && usedSchemaNames.has(name);
    });
    
    console.log(`Using ${usedSchemas.length} schemas out of ${schemas.length} total`);
    
    // Step 5: Generate final file
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
${usedSchemas.join('\n\n')}

export const GENERATED_KIBANA_CONNECTORS: ConnectorContract[] = [
${connectors.join(',\n')}
];

export const KIBANA_CONNECTOR_COUNT = ${connectors.length};
`;

    fs.writeFileSync(OUTPUT_PATH, fileContent);
    console.log(`✅ Generated ${OUTPUT_PATH}`);
    console.log(`🎉 Successfully generated ${connectors.length} Kibana connectors!`);
    
    // Cleanup
    fs.unlinkSync(tempPath);
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
}

/**
 * Extract all schema definitions from the generated content
 */
function extractAllSchemas(content) {
  // Use the 's' flag to make . match newlines, and non-greedy matching
  const schemaRegex = /^const ([A-Za-z_][A-Za-z0-9_]*) = z\..*?;$/gms;
  const schemas = [];
  let match;
  
  while ((match = schemaRegex.exec(content)) !== null) {
    schemas.push(match[0]);
  }
  
  return schemas;
}

/**
 * Extract endpoint information
 */
function extractEndpoints(content) {
  const endpointsMatch = content.match(/const endpoints = makeApi\(\[([\s\S]*?)\]\);/);
  if (!endpointsMatch) return [];
  
  const endpointsContent = endpointsMatch[1];
  const endpoints = [];
  
  // Parse each endpoint object
  let depth = 0;
  let start = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < endpointsContent.length; i++) {
    const char = endpointsContent[i];
    const prevChar = i > 0 ? endpointsContent[i - 1] : '';
    
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    if (!inString) {
      if (char === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          const endpointStr = endpointsContent.substring(start, i + 1);
          const parsed = parseEndpoint(endpointStr);
          if (parsed) endpoints.push(parsed);
        }
      }
    }
  }
  
  return endpoints;
}

/**
 * Parse individual endpoint object
 */
function parseEndpoint(endpointStr) {
  const methodMatch = endpointStr.match(/method:\s*['"](\w+)['"]/);
  const pathMatch = endpointStr.match(/path:\s*['"]([^'"]+)['"]/);
  const aliasMatch = endpointStr.match(/alias:\s*['"]([^'"]+)['"]/);
  
  if (!methodMatch || !pathMatch || !aliasMatch) return null;
  
  const method = methodMatch[1];
  const path = pathMatch[1];
  const alias = aliasMatch[1];
  
  // Find body schema
  let bodySchema = null;
  const bodyMatch = endpointStr.match(/name:\s*['"]body['"][\s\S]*?schema:\s*([A-Za-z_][A-Za-z0-9_]*)/);
  if (bodyMatch) {
    bodySchema = bodyMatch[1];
  }
  
  // Find query/path parameters
  const params = [];
  const paramRegex = /\{\s*name:\s*['"]([^'"]+)['"],\s*type:\s*['"]([^'"]+)['"][\s\S]*?schema:\s*([^,}]+)/g;
  let paramMatch;
  
  while ((paramMatch = paramRegex.exec(endpointStr)) !== null) {
    const [, name, type, schema] = paramMatch;
    if (type === 'Query' || type === 'Path') {
      const quotedName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? name : `"${name}"`;
      params.push(`${quotedName}: ${schema.trim()}`);
    }
  }
  
  return { method, path, alias, bodySchema, params };
}

/**
 * Create ConnectorContract from endpoint
 */
function createConnector(endpoint, schemas) {
  const type = `kibana.${endpoint.alias}`;
  const description = `API endpoint: ${endpoint.method.toUpperCase()} ${endpoint.path}`;
  
  let paramsSchema;
  if (endpoint.bodySchema) {
    paramsSchema = endpoint.bodySchema;
  } else if (endpoint.params && endpoint.params.length > 0) {
    paramsSchema = `z.object({ ${endpoint.params.join(', ')} })`;
  } else {
    paramsSchema = 'z.object({})';
  }
  
  return `  {
    type: '${type}',
    connectorIdRequired: false,
    paramsSchema: ${paramsSchema},
    outputSchema: z.any().describe('${description}'),
  }`;
}

/**
 * Add schema dependencies recursively
 */
function addSchemaDependencies(schemaName, allSchemas, usedSchemas) {
  if (usedSchemas.has(schemaName)) return;
  
  usedSchemas.add(schemaName);
  
  // Find the schema definition
  const schemaDef = allSchemas.find(s => s.startsWith(`const ${schemaName} =`));
  if (!schemaDef) return;
  
  // Find references to other schemas in this definition
  const references = schemaDef.match(/[A-Za-z_][A-Za-z0-9_]*(?=\s*[,\)\}\.])/g) || [];
  for (const ref of references) {
    if (ref !== schemaName && allSchemas.some(s => s.startsWith(`const ${ref} =`))) {
      addSchemaDependencies(ref, allSchemas, usedSchemas);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };

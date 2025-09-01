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
 * Build-time script to generate Kibana connector schemas from OpenAPI specifications
 * This reads Kibana's OpenAPI bundle and generates static connector data for the browser
 */

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { execSync } = require('child_process');

// Path to Kibana OpenAPI bundle (using the complete YAML file instead of limited JSON bundle)
const KIBANA_OPENAPI_PATH = path.resolve(process.cwd(), 'oas_docs/output/kibana.yaml');
const OUTPUT_PATH = path.resolve(__dirname, '../common/generated_kibana_connectors.ts');

console.log('🔧 Generating Kibana connectors from OpenAPI specifications...');
console.log(`📁 Reading from: ${KIBANA_OPENAPI_PATH}`);
console.log(`📝 Writing to: ${OUTPUT_PATH}`);

// Check if OpenAPI bundle exists
if (!fs.existsSync(KIBANA_OPENAPI_PATH)) {
  console.warn('⚠️  Kibana OpenAPI bundle not found at:', KIBANA_OPENAPI_PATH);
  console.warn('Creating empty connector file as fallback');
}

/**
 * Extract path parameters from OpenAPI path
 * e.g., "/api/data_views/{dataViewId}" -> ["dataViewId"]
 */
function extractOpenAPIPathParameters(path) {
  const params = [];
  const matches = path.match(/\{([^}]+)\}/g);
  
  if (matches) {
    for (const match of matches) {
      const param = match.slice(1, -1); // Remove { }
      params.push(param);
    }
  }

  return params;
}

/**
 * Convert OpenAPI parameter to Zod schema string
 */
function convertOpenAPIParameterToZodString(param) {
  let zodType = 'z.string()'; // Default fallback

  // Handle different schema types
  if (param.schema) {
    switch (param.schema.type) {
      case 'string':
        if (param.schema.enum) {
          const enumValues = param.schema.enum.map(val => `'${val}'`).join(', ');
          zodType = `z.enum([${enumValues}])`;
        } else {
          zodType = 'z.string()';
        }
        break;
      case 'number':
      case 'integer':
        zodType = 'z.number()';
        break;
      case 'boolean':
        zodType = 'z.boolean()';
        break;
      case 'array':
        zodType = 'z.array(z.any())';
        break;
      case 'object':
        zodType = 'z.record(z.any())';
        break;
      default:
        zodType = 'z.any()';
    }
  }

  // Make optional if not required
  if (!param.required) {
    zodType += '.optional()';
  }

  // Add description
  if (param.description) {
    // Clean up description: escape quotes, remove newlines, limit length
    const cleanDescription = param.description
      .replace(/'/g, "\\'")           // Escape single quotes
      .replace(/"/g, '\\"')           // Escape double quotes
      .replace(/\n/g, ' ')            // Replace newlines with spaces
      .replace(/\r/g, ' ')            // Replace carriage returns with spaces
      .replace(/\s+/g, ' ')           // Collapse multiple spaces
      .trim()                         // Remove leading/trailing whitespace
      .substring(0, 200);             // Limit to 200 characters
    
    zodType += `.describe('${cleanDescription}')`;
  }

  return zodType;
}

/**
 * Collect all schemas referenced by a given schema definition
 */
function collectReferencedSchemas(schemaDefinition, allSchemas, usedSchemas) {
  // Find references to other schemas in the definition (e.g., Cases_assignees, Cases_owner, etc.)
  const schemaRefs = schemaDefinition.match(/[A-Z][A-Za-z_][A-Za-z0-9_]*/g) || [];
  
  for (const ref of schemaRefs) {
    if (allSchemas[ref] && !usedSchemas.has(ref)) {
      usedSchemas.add(ref);
      // Recursively collect referenced schemas
      collectReferencedSchemas(allSchemas[ref], allSchemas, usedSchemas);
    }
  }
}

/**
 * Generate a ConnectorContract from a Zod client endpoint definition
 */
function generateConnectorFromEndpoint(endpoint, schemas) {
  const type = `kibana.${endpoint.operationId}`;
  
  // Build parameters schema - since the raw schemas are too complex and have formatting issues,
  // let's use a simpler approach and just reference the schema name if it exists
  let paramsSchemaContent = '';
  
  // For now, simplify all body schemas to z.any() until we can properly handle complex schemas
  if (endpoint.bodySchema) {
    paramsSchemaContent = 'z.any()';
    console.log(`🔧 Using z.any() for ${endpoint.bodySchema} in ${type}`);
  } else {
    // No body schema, create empty object
    paramsSchemaContent = 'z.object({})';
  }
  
  const description = `API endpoint: ${endpoint.method.toUpperCase()} ${endpoint.path}`;
  
  return `  {
    type: '${type}',
    connectorIdRequired: false,
    paramsSchema: ${paramsSchemaContent},
    outputSchema: z.any().describe('${description}'),
  }`;
}

/**
 * Generate a single Kibana connector definition from OpenAPI operation (LEGACY)
 */
function generateKibanaConnectorDefinition(path, method, operation, schemaFields = {}) {
  // Create a unique type identifier
  const operationId = operation.operationId || `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const type = `kibana.${operationId}`;

  // Extract path parameters
  const pathParams = extractOpenAPIPathParameters(path);
  const paramFields = [];
  const usedParamNames = new Set();

  // Add path parameters
  pathParams.forEach(param => {
    if (!param || usedParamNames.has(param)) return;
    
    // Quote parameter names if they contain special characters
    const paramKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(param) ? param : `'${param}'`;
    paramFields.push(`    ${paramKey}: z.string().describe('Path parameter: ${param}'),`);
    usedParamNames.add(param);
  });

  // Add operation parameters
  if (operation.parameters) {
    operation.parameters.forEach(param => {
      // Skip parameters without names or with duplicate names
      if (!param.name || usedParamNames.has(param.name)) {
        return;
      }
      
      const zodString = convertOpenAPIParameterToZodString(param);
      // Quote parameter names if they contain special characters (like hyphens)
      const paramKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(param.name) ? param.name : `'${param.name}'`;
      paramFields.push(`    ${paramKey}: ${zodString},`);
      usedParamNames.add(param.name);
    });
  }

  // Add request body fields if present
  if (operation.requestBody?.content) {
    // Try to get the schema reference for proper typing
    const applicationJsonContent = operation.requestBody.content['application/json'];
    if (applicationJsonContent?.schema?.$ref) {
      const schemaRef = applicationJsonContent.schema.$ref;
      const schemaName = schemaRef.split('/').pop();
      
      // Use extracted schema fields if available
      if (schemaName && schemaFields[schemaName] && schemaFields[schemaName].length > 0) {
        console.log(`🔍 Expanding ${schemaFields[schemaName].length} fields for ${schemaName}`);
        
        // Add each field from the schema definition, ensuring no duplicates with existing params
        schemaFields[schemaName].forEach(fieldDef => {
          const fieldNameMatch = fieldDef.match(/^\s*([a-zA-Z_$][a-zA-Z0-9_$]*|\'.+?\'):/);
          if (fieldNameMatch) {
            const fieldName = fieldNameMatch[1].replace(/^['"](.+)['"]$/, '$1');
            if (!usedParamNames.has(fieldName)) {
              paramFields.push(fieldDef);
              usedParamNames.add(fieldName);
            }
          }
        });
      } else {
        // Manual definitions for complex schemas that are hard to parse automatically
        const manualFields = getManualSchemaFields(schemaName);
        if (manualFields.length > 0) {
          console.log(`🔧 Using manual definition for ${schemaName} (${manualFields.length} fields)`);
          manualFields.forEach(fieldDef => {
            const fieldNameMatch = fieldDef.match(/^\s*([a-zA-Z_$][a-zA-Z0-9_$]*|\'.+?\'):/);
            if (fieldNameMatch) {
              const fieldName = fieldNameMatch[1].replace(/^['"](.+)['"]$/, '$1');
              if (!usedParamNames.has(fieldName)) {
                paramFields.push(fieldDef);
                usedParamNames.add(fieldName);
              }
            }
          });
        } else {
          // Fallback to generic body for schemas we couldn't parse
          paramFields.push(`    body: z.any().optional().describe('Request body${schemaName ? ` (${schemaName})` : ''}'),`);
        }
      }
    } else {
      // Fallback to generic body if no schema reference
      paramFields.push(`    body: z.any().optional().describe('Request body'),`);
    }
  }

  // Note: method and path are handled internally by the workflow engine, not exposed to users

  const paramsSchemaString = paramFields.length > 0 
    ? `z.object({\n${paramFields.join('\n')}\n  })` 
    : 'z.object({})';

  const rawDescription = operation.summary || operation.description || 'Kibana API response';
  
  // Clean up description for output schema
  const description = rawDescription
    .replace(/'/g, "\\'")           // Escape single quotes
    .replace(/"/g, '\\"')           // Escape double quotes
    .replace(/\n/g, ' ')            // Replace newlines with spaces
    .replace(/\r/g, ' ')            // Replace carriage returns with spaces
    .replace(/\s+/g, ' ')           // Collapse multiple spaces
    .trim()                         // Remove leading/trailing whitespace
    .substring(0, 200);             // Limit to 200 characters

  return `  {
    type: '${type}',
    connectorIdRequired: false,
    paramsSchema: ${paramsSchemaString},
    outputSchema: z.any().describe('${description}'),
  }`;
}

/**
 * Generate full client using openapi-zod-client and extract what we need
 */
function generateZodClient() {
  const tempPath = '/tmp/kibana-zod-client.ts';
  console.log('🔧 Generating full Zod client using openapi-zod-client...');
  
  try {
    execSync(`npx openapi-zod-client ${KIBANA_OPENAPI_PATH} -o ${tempPath} --export-schemas --with-description`, {
      stdio: 'ignore'
    });
    console.log('✅ Generated Zod client with schemas and endpoints');
    return tempPath;
  } catch (error) {
    console.warn('⚠️  Failed to generate Zod client, falling back to basic parsing');
    return null;
  }
}

/**
 * Extract endpoint definitions from the generated Zod client
 */
function extractEndpointsFromZodClient(clientPath) {
  if (!clientPath || !fs.existsSync(clientPath)) {
    return [];
  }
  
  try {
    const content = fs.readFileSync(clientPath, 'utf8');
    const endpoints = [];
    
    // Find the endpoints array definition: const endpoints = makeApi([...]);
    const endpointsMatch = content.match(/const endpoints = makeApi\(\[([\s\S]*?)\]\);/);
    if (!endpointsMatch) {
      console.warn('⚠️  Could not find endpoints array in generated client');
      return [];
    }
    
    const endpointsContent = endpointsMatch[1];
    
    // Parse individual endpoint objects
    const endpointRegex = /\{\s*method:\s*['"](\w+)['"],\s*path:\s*['"]([^'"]+)['"],\s*alias:\s*['"]([^'"]+)['"],[\s\S]*?parameters:\s*\[([\s\S]*?)\],[\s\S]*?response:\s*([^,\}]+)[,\s]*[\s\S]*?\}/g;
    
    let match;
    while ((match = endpointRegex.exec(endpointsContent)) !== null) {
      const method = match[1];
      const path = match[2];
      const operationId = match[3];
      const parametersContent = match[4];
      const responseSchema = match[5].trim();
      
      // Parse parameters to find body schema
      const bodyParam = extractBodyParameter(parametersContent);
      
      endpoints.push({
        method,
        path,
        operationId,
        bodySchema: bodyParam?.schema,
        responseSchema
      });
    }
    
    console.log(`🗂️  Extracted ${endpoints.length} endpoint definitions from Zod client`);
    return endpoints;
  } catch (error) {
    console.warn('⚠️  Failed to parse Zod client file:', error.message);
    return [];
  }
}

/**
 * Extract body parameter schema from parameters content
 */
function extractBodyParameter(parametersContent) {
  const bodyMatch = parametersContent.match(/\{\s*name:\s*['"]body['"],\s*type:\s*['"]Body['"],\s*schema:\s*([^,\}]+)/);
  if (bodyMatch) {
    return {
      name: 'body',
      type: 'Body',
      schema: bodyMatch[1].trim()
    };
  }
  return null;
}

/**
 * Clean up schema definition to fix string literal issues
 */
function cleanSchemaDefinition(schemaDefinition) {
  // Fix string literals that contain unescaped newlines, quotes, and other problematic characters
  return schemaDefinition
    .replace(/\n/g, '\\n')              // Escape newlines
    .replace(/\r/g, '\\r')              // Escape carriage returns
    .replace(/\t/g, '\\t')              // Escape tabs
    .replace(/`/g, '\\`')               // Escape backticks
    .replace(/\$\{/g, '\\${')           // Escape template literal expressions
    .replace(/\\\\/g, '\\\\\\\\');      // Fix double backslashes
}

/**
 * Extract schema definitions from the generated Zod client
 */
function extractSchemasFromZodClient(clientPath) {
  if (!clientPath || !fs.existsSync(clientPath)) {
    return {};
  }
  
  try {
    const content = fs.readFileSync(clientPath, 'utf8');
    const schemas = {};
    
    // Find all schema definitions: const SchemaName = z.object({...});
    const schemaRegex = /const ([A-Za-z_][A-Za-z0-9_]*) = z\.[^;]+;/g;
    
    let match;
    while ((match = schemaRegex.exec(content)) !== null) {
      const schemaName = match[1];
      let schemaDefinition = match[0];
      
      // Clean up the schema definition to fix string literal issues
      schemaDefinition = cleanSchemaDefinition(schemaDefinition);
      
      schemas[schemaName] = schemaDefinition;
    }
    
    console.log(`🗂️  Extracted ${Object.keys(schemas).length} schema definitions from Zod client`);
    return schemas;
  } catch (error) {
    console.warn('⚠️  Failed to extract schemas from Zod client:', error.message);
    return {};
  }
}

/**
 * Extract schema field definitions from generated Zod file
 */
function extractSchemaFields(zodFilePath) {
  if (!zodFilePath || !fs.existsSync(zodFilePath)) {
    return {};
  }
  
  try {
    const content = fs.readFileSync(zodFilePath, 'utf8');
    const schemaFields = {};
    
    // Parse schema definitions to extract individual field definitions  
    // Handle both multiline and single-line schema formats
    const schemaRegex = /const ([A-Za-z_][A-Za-z0-9_]*) = z\.object\(\{([^}]+)\}\)(?:\.passthrough\(\))?(?:\.partial\(\))?(?:\.describe\([^)]*\))?(?:\.optional\(\))?(?:\.nullable\(\))?(?:\.nullish\(\))?;/g;
    
    let match;
    while ((match = schemaRegex.exec(content)) !== null) {
      const schemaName = match[1];
      const fieldsContent = match[2];
      
      // Parse individual fields from the object definition
      const fields = parseSchemaFields(fieldsContent);
      if (fields.length > 0) {
        schemaFields[schemaName] = fields;
      }
    }
    
    console.log(`🗂️  Extracted fields for ${Object.keys(schemaFields).length} schemas`);
    return schemaFields;
  } catch (error) {
    console.warn('⚠️  Failed to parse Zod schemas file:', error.message);
    return {};
  }
}

/**
 * Get manual field definitions for complex schemas that are hard to parse automatically
 */
function getManualSchemaFields(schemaName) {
  const manualSchemas = {
    'Cases_create_case_request': [
      `    title: z.string().max(160).describe('A title for the case'),`,
      `    description: z.string().max(30000).describe('The description for the case'),`,
      `    owner: z.enum(['cases', 'securitySolution', 'observability']).describe('The application that owns the case'),`,
      `    tags: z.array(z.string()).max(200).describe('Words and phrases that help categorize cases').optional(),`,
      `    severity: z.enum(['low', 'medium', 'high', 'critical']).describe('The severity of the case').optional(),`,
      `    assignees: z.array(z.string()).max(10).describe('Users assigned to the case').optional(),`,
      `    category: z.string().max(50).describe('A word or phrase that categorizes the case').optional(),`
    ],
    'Cases_update_case_request': [
      `    title: z.string().max(160).describe('A title for the case').optional(),`,
      `    description: z.string().max(30000).describe('The description for the case').optional(),`,
      `    tags: z.array(z.string()).max(200).describe('Words and phrases that help categorize cases').optional(),`,
      `    severity: z.enum(['low', 'medium', 'high', 'critical']).describe('The severity of the case').optional(),`,
      `    assignees: z.array(z.string()).max(10).describe('Users assigned to the case').optional(),`,
      `    category: z.string().max(50).describe('A word or phrase that categorizes the case').optional(),`
    ],
    'Cases_add_comment_request': [
      `    comment: z.string().min(1).describe('The comment content'),`,
      `    type: z.enum(['user', 'alert']).describe('The type of comment'),`,
      `    owner: z.enum(['cases', 'securitySolution', 'observability']).describe('The application that owns the case').optional(),`
    ]
  };
  
  return manualSchemas[schemaName] || [];
}

/**
 * Parse individual field definitions from a schema object content
 */
function parseSchemaFields(fieldsContent) {
  const fields = [];
  
  // Handle compact single-line format by first splitting on commas at the top level
  const fieldTokens = [];
  let currentToken = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < fieldsContent.length; i++) {
    const char = fieldsContent[i];
    const prevChar = i > 0 ? fieldsContent[i - 1] : '';
    
    // Handle string boundaries
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }
    
    if (!inString) {
      // Track nesting depth
      if (char === '{' || char === '[' || char === '(') {
        depth++;
      } else if (char === '}' || char === ']' || char === ')') {
        depth--;
      }
      
      // Split on commas at top level
      if (char === ',' && depth === 0) {
        fieldTokens.push(currentToken.trim());
        currentToken = '';
        continue;
      }
    }
    
    currentToken += char;
  }
  
  // Don't forget the last token
  if (currentToken.trim()) {
    fieldTokens.push(currentToken.trim());
  }
  
  // Parse each field token
  for (const token of fieldTokens) {
    const fieldMatch = token.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(.+)$/);
    
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const fieldDefinition = fieldMatch[2];
      
      // Clean up field definition by removing extra whitespace
      const cleanedDef = fieldDefinition.replace(/\s+/g, ' ').trim();
      
      // Format for output
      fields.push(`    ${fieldName}: ${cleanedDef},`);
    }
  }
  
  return fields;
}

/**
 * Main generation function for Kibana connectors
 */
function generateKibanaConnectors() {
  try {
    // Generate Zod client using openapi-zod-client
    const zodClientPath = generateZodClient();
    if (!zodClientPath) {
      console.error('❌ Failed to generate Zod client, cannot proceed');
      return;
    }

    // Extract endpoints and schemas from the generated client  
    const endpoints = extractEndpointsFromZodClient(zodClientPath);
    const schemas = extractSchemasFromZodClient(zodClientPath);

    const connectorDefinitions = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each endpoint from the Zod client
    for (const endpoint of endpoints) {
      try {
        const connectorDef = generateConnectorFromEndpoint(endpoint, schemas);
        if (connectorDef) {
          connectorDefinitions.push(connectorDef);
          successCount++;
        }
      } catch (error) {
        console.warn(`⚠️  Failed to process ${endpoint.method.toUpperCase()} ${endpoint.path}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`📊 Generated ${successCount} Kibana connectors, ${errorCount} errors`);

    // For now, skip including the complex schema definitions to avoid formatting issues
    // We'll reference simple schema names directly or use z.any() for complex ones
    const schemaDefinitions = '// Schema definitions would go here, but are complex and cause formatting issues';

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
 * This file contains auto-generated Kibana connector definitions from OpenAPI specifications.
 * Generated at: ${new Date().toISOString()}
 * Source: Kibana OpenAPI bundle (${successCount} APIs)
 * 
 * To regenerate: npm run generate:kibana-connectors
 */

import { z } from '@kbn/zod';
import type { ConnectorContract } from '@kbn/workflows';

// Schema definitions from OpenAPI spec
${schemaDefinitions}

export const GENERATED_KIBANA_CONNECTORS: ConnectorContract[] = [
${connectorDefinitions.join(',\n')}
];

export const KIBANA_CONNECTOR_COUNT = ${successCount};
`;

    fs.writeFileSync(OUTPUT_PATH, fileContent, 'utf8');
    console.log(`📝 Generated ${OUTPUT_PATH}`);
    console.log(`🎉 Successfully generated ${successCount} Kibana connectors!`);

    return { success: true, count: successCount };
  } catch (error) {
    console.error('❌ Error generating Kibana connectors:', error);
    console.error(error.stack);
    
    // For development, create an empty file rather than failing completely
    const fallbackContent = `/*
 * GENERATED FILE - DO NOT EDIT
 * 
 * This file contains auto-generated Kibana connector definitions from OpenAPI specifications.
 * Generated at: ${new Date().toISOString()}
 * Source: Kibana OpenAPI bundle (0 APIs - generation failed)
 * 
 * To regenerate: npm run generate:kibana-connectors
 */

import { z } from '@kbn/zod';
import type { ConnectorContract } from '@kbn/workflows';

export const GENERATED_KIBANA_CONNECTORS: ConnectorContract[] = [];

export const KIBANA_CONNECTOR_COUNT = 0;
`;
    
    fs.writeFileSync(OUTPUT_PATH, fallbackContent, 'utf8');
    console.log(`📝 Generated fallback ${OUTPUT_PATH} due to error`);
    
    process.exit(1);
  }
}

// Run the generator
if (require.main === module) {
  generateKibanaConnectors();
}

module.exports = { generateKibanaConnectors };

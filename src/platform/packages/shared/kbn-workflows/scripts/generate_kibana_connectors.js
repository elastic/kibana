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

/**
 * Helper function to safely quote parameter names if needed
 */
function safeParamName(param) {
  // If parameter name contains special characters, quote it
  if (/[^a-zA-Z0-9_$]/.test(param)) {
    return `'${param}'`;
  }
  return param;
}

// Paths
const KIBANA_OPENAPI_SPEC_PATH = path.resolve(
  __dirname,
  '../../../../../../oas_docs/output/kibana.yaml'
);
const OUTPUT_PATH = path.resolve(__dirname, '../common/generated_kibana_connectors.ts');
const SCHEMAS_OUTPUT_PATH = path.resolve(__dirname, '../common/generated_kibana_schemas.ts');
const TEMP_OUTPUT_PATH = path.resolve(__dirname, '../common/temp_kibana_api.ts');

console.log('🔧 Generating Kibana connectors from OpenAPI spec...');
console.log(`📁 Reading from: ${KIBANA_OPENAPI_SPEC_PATH}`);
console.log(`📝 Writing to: ${OUTPUT_PATH}`);

// Check if OpenAPI spec exists
if (!fs.existsSync(KIBANA_OPENAPI_SPEC_PATH)) {
  console.error('❌ Kibana OpenAPI spec not found at:', KIBANA_OPENAPI_SPEC_PATH);
  console.error(
    'Make sure the OpenAPI spec is generated first by running: cd oas_docs && npm run build'
  );
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
 * Extract tag documentation URLs from OpenAPI spec (simplified for fallback only)
 */
function extractTagDocumentation() {
  const tagDocs = new Map();

  try {
    const specPath = path.resolve(__dirname, '../../../../../../oas_docs/output/kibana.yaml');
    if (!fs.existsSync(specPath)) {
      return tagDocs;
    }

    const specContent = fs.readFileSync(specPath, 'utf8');

    // Extract tag documentation for fallback purposes only
    const externalDocsRegex =
      /externalDocs:\s*\n\s*description: ([^\n\r]+)\s*\n\s*url: ([^\s\n\r]+)/g;
    let match;

    while ((match = externalDocsRegex.exec(specContent)) !== null) {
      const [fullMatch, description, url] = match;
      const beforeMatch = specContent.substring(0, match.index);

      // Look backwards for the most recent tag name
      const tagNameMatch = beforeMatch.match(/name: ([^\n\r]+)(?=[\s\S]*?$)/);

      if (tagNameMatch) {
        const cleanTagName = tagNameMatch[1].trim();
        const cleanUrl = url.trim();

        if (!tagDocs.has(cleanTagName)) {
          tagDocs.set(cleanTagName, {
            description: description.trim(),
            url: cleanUrl,
          });
        }
      }
    }

    console.log(`📚 Extracted ${tagDocs.size} tag fallback URLs`);
  } catch (error) {
    console.warn('⚠️ Error extracting tag documentation:', error.message);
  }

  return tagDocs;
}

/**
 * Generate documentation URL for a Kibana API endpoint
 */
function generateDocumentationUrl(method, path, operationId, tagDocs) {
  // Use the official Kibana API documentation pattern with operationId
  if (operationId && operationId.trim()) {
    const lowerOperationId = operationId.toLowerCase();
    const docUrl = `https://www.elastic.co/docs/api/doc/kibana/operation/operation-${lowerOperationId}`;
    return docUrl;
  }

  // Fallback: Try to find a matching tag for this API if no operationId
  const apiPatterns = [
    { pattern: /^\/api\/actions/, tag: 'connectors' },
    { pattern: /^\/api\/alerting/, tag: 'alerting' },
    { pattern: /^\/api\/cases/, tag: 'cases' },
    { pattern: /^\/api\/fleet/, tag: 'Data streams' },
    { pattern: /^\/api\/logstash/, tag: 'Fleet Server hosts' },
    { pattern: /^\/api\/observability/, tag: 'Message Signing Service' },
    { pattern: /^\/api\/security/, tag: 'roles' },
    { pattern: /^\/api\/saved_objects/, tag: 'saved objects' },
    { pattern: /^\/api\/task_manager/, tag: 'system' },
    { pattern: /^\/api\/internal\/session/, tag: 'user session' },
    { pattern: /^\/api\/maintenance_window/, tag: 'maintenance-window' },
  ];

  for (const { pattern, tag } of apiPatterns) {
    if (pattern.test(path)) {
      const tagDoc = tagDocs.get(tag);
      if (tagDoc) {
        return tagDoc.url;
      }
    }
  }

  // Final fallback to general Kibana API documentation
  console.log(
    `⚠️ No pattern matched for ${path} (operationId: ${operationId}) → fallback to generic`
  );
  return 'https://www.elastic.co/guide/en/kibana/current/api.html';
}

/**
 * Extract examples from OpenAPI spec for a specific endpoint
 */
function extractExamplesFromSpec(method, path) {
  const examples = {
    request: null,
    response: null,
    requestParams: {},
    responseData: null,
  };

  try {
    const specPath = path.resolve(__dirname, '../../../../../../oas_docs/output/kibana.yaml');
    if (!fs.existsSync(specPath)) {
      return examples;
    }

    const specContent = fs.readFileSync(specPath, 'utf8');

    // Convert OpenAPI path format to match our extraction
    // From /api/spaces/space/{id} to /api/spaces/space/:id
    const specPathPattern = path.replace(/\{([^}]+)\}/g, '{$1}');

    // Look for the specific endpoint in the YAML
    const pathRegex = new RegExp(
      `${escapeRegex(specPathPattern)}['"]?:\\s*\\n([\\s\\S]*?)(?=\\n\\s*['\\/]|\\n[a-z]|$)`,
      'i'
    );
    const pathMatch = specContent.match(pathRegex);

    if (pathMatch) {
      const endpointContent = pathMatch[1];

      // Look for the specific method within this path
      const methodRegex = new RegExp(
        `${method.toLowerCase()}:\\s*\\n([\\s\\S]*?)(?=\\n\\s*[a-z]|$)`,
        'i'
      );
      const methodMatch = endpointContent.match(methodRegex);

      if (methodMatch) {
        const operationContent = methodMatch[1];

        // Extract request examples
        const requestBodyMatch = operationContent.match(
          /requestBody:[\\s\\S]*?examples:\\s*\\n([\\s\\S]*?)(?=\\n\\s*responses:|\\n\\s*[a-z]|$)/
        );
        if (requestBodyMatch) {
          const requestExamples = extractYamlExamples(requestBodyMatch[1]);
          if (requestExamples.length > 0) {
            examples.request = requestExamples[0]; // Use first example
            examples.requestParams = parseExampleForParams(requestExamples[0], method);
          }
        }

        // Extract response examples
        const responseMatch = operationContent.match(
          /responses:[\\s\\S]*?200:[\\s\\S]*?examples:\\s*\\n([\\s\\S]*?)(?=\\n\\s*[1-5]\\d\\d:|\\n\\s*[a-z]|$)/
        );
        if (responseMatch) {
          const responseExamples = extractYamlExamples(responseMatch[1]);
          if (responseExamples.length > 0) {
            examples.response = responseExamples[0]; // Use first example
            examples.responseData = parseExampleValue(responseExamples[0]);
          }
        }
      }
    }
  } catch (error) {
    // Silently continue - examples are optional
  }

  return examples;
}

/**
 * Extract YAML example references and load them
 */
function extractYamlExamples(examplesContent) {
  const examples = [];

  // Look for $ref patterns pointing to example files
  const refMatches = examplesContent.match(/\$ref:\s*['"](\.\.\/examples\/[^'"]+)['"]/g);

  if (refMatches) {
    for (const refMatch of refMatches) {
      const refPath = refMatch.match(/\$ref:\s*['"](\.\.\/examples\/[^'"]+)['"]/)[1];
      const examplePath = path.resolve(__dirname, '../../../../../../oas_docs', refPath);

      try {
        if (fs.existsSync(examplePath)) {
          const exampleContent = fs.readFileSync(examplePath, 'utf8');
          examples.push(exampleContent);
        }
      } catch (error) {
        // Continue with other examples
      }
    }
  }

  // Also look for inline examples
  const inlineMatches = examplesContent.match(/value:\\s*\\n([\\s\\S]*?)(?=\\n\\s*[a-zA-Z]|$)/g);
  if (inlineMatches) {
    for (const inlineMatch of inlineMatches) {
      examples.push(inlineMatch.replace(/value:\s*\n/, ''));
    }
  }

  return examples;
}

/**
 * Parse example YAML content to extract parameter values
 */
function parseExampleForParams(exampleContent, method) {
  const params = {};

  try {
    // Parse YAML content to extract parameter values
    const valueMatch = exampleContent.match(/value:\\s*\\n([\\s\\S]*)/);
    if (valueMatch) {
      const yamlContent = valueMatch[1];

      // Simple YAML parsing for common patterns
      const lines = yamlContent.split('\\n');
      let currentIndent = 0;
      const currentPath = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const indent = line.length - line.trimLeft().length;
        const colonIndex = line.indexOf(':');

        if (colonIndex > 0) {
          const key = line.substring(indent, colonIndex).trim();
          const value = line.substring(colonIndex + 1).trim();

          // Adjust path based on indentation
          while (currentPath.length > 0 && indent <= currentIndent) {
            currentPath.pop();
            currentIndent -= 2;
          }

          if (value && !value.startsWith('-')) {
            // Store the parameter value
            const fullKey = currentPath.length > 0 ? currentPath.join('.') + '.' + key : key;
            params[fullKey] = value.replace(/['"]/g, '');
          }

          if (value === '' || value.startsWith('-')) {
            currentPath.push(key);
            currentIndent = indent;
          }
        }
      }
    }
  } catch (error) {
    // Continue - examples are optional
  }

  return params;
}

/**
 * Parse example YAML to extract the actual data value
 */
function parseExampleValue(exampleContent) {
  try {
    const valueMatch = exampleContent.match(/value:\\s*\\n([\\s\\S]*)/);
    if (valueMatch) {
      // Return a simplified version of the example
      return valueMatch[1].split('\\n').slice(0, 5).join('\\n'); // First 5 lines
    }
  } catch (error) {
    // Continue
  }
  return null;
}

/**
 * Escape special regex characters
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
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
              const schemaMatch = paramMatch.match(/schema:\s*([^,\s]+)/);

              if (nameMatch && typeMatch) {
                parameters.push({
                  name: nameMatch[1],
                  type: typeMatch[1],
                  schema: schemaMatch ? schemaMatch[1] : null,
                });
              }
            }
          }
        }

        // Extract examples for this endpoint
        const examples = extractExamplesFromSpec(method, path);

        endpoints.push({
          method,
          path,
          operationId,
          alias,
          parameters,
          examples,
          rawContent: endpointObj,
        });
      }
    } catch (error) {
      console.warn('⚠️  Failed to parse endpoint:', error.message);
    }
  }

  return endpoints;
}

/**
 * Parse balanced brackets/parentheses to extract complete field definitions
 */
function extractFieldDefinition(content, startIndex) {
  const depth = 0;
  let inString = false;
  let stringChar = '';
  let i = startIndex;
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  while (i < content.length) {
    const char = content[i];

    if (inString) {
      if (char === stringChar && content[i - 1] !== '\\') {
        inString = false;
      }
    } else {
      if (char === '"' || char === "'" || char === '`') {
        inString = true;
        stringChar = char;
      } else if (char === '(') {
        parenDepth++;
      } else if (char === ')') {
        parenDepth--;
      } else if (char === '[') {
        bracketDepth++;
      } else if (char === ']') {
        bracketDepth--;
      } else if (char === '{') {
        braceDepth++;
      } else if (char === '}') {
        braceDepth--;
      } else if (char === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
        return content.substring(startIndex, i).trim();
      }
    }
    i++;
  }

  return content.substring(startIndex).trim();
}

/**
 * Dynamically extract field names AND their types from a Zod schema definition
 * This "explodes" the schema to get all top-level fields with their actual Zod schemas
 */
function extractFieldsFromSchema(schemaDefinition) {
  const fields = new Map(); // Map<fieldName, zodSchema>

  try {
    // Handle union schemas first - z.union([...])
    const unionMatch = schemaDefinition.match(/\.union\(\s*\[\s*([\s\S]*?)\s*\]\s*\)/);
    if (unionMatch) {
      // Uncomment for debugging: console.log(`🔄 Processing union schema`);
      const unionContent = unionMatch[1];
      
      // Extract schema references from the union
      const schemaRefs = unionContent.match(/[A-Za-z_][A-Za-z0-9_]*/g);
      if (schemaRefs) {
        // Uncomment for debugging: console.log(`🔍 Found union members:`, schemaRefs);
        
        // For union schemas, we'll extract fields from all union members
        // and create a combined field set with optional fields
        const allUnionFields = new Map();
        
        for (const schemaRef of schemaRefs) {
          // Skip common Zod method names
          if (['z', 'union', 'object', 'string', 'number', 'boolean', 'array'].includes(schemaRef)) {
            continue;
          }
          
          // Try to find and process each union member schema
          const memberFields = extractFieldsFromUnionMember(schemaRef);
          for (const [fieldName, fieldDef] of memberFields) {
            // Mark all union fields as optional since they depend on which union branch is chosen
            const optionalFieldDef = fieldDef.includes('.optional()') ? fieldDef : `${fieldDef}.optional()`;
            allUnionFields.set(fieldName, optionalFieldDef);
          }
        }
        
        // Uncomment for debugging: console.log(`📋 Extracted ${allUnionFields.size} fields from union:`, Array.from(allUnionFields.keys()));
        return allUnionFields;
      }
    }

    // Handle regular object schemas - z.object({ ... })
    const objectMatch = schemaDefinition.match(/\.object\(\s*\{([\s\S]*)\}\s*\)/);
    if (!objectMatch) {
      // Uncomment for debugging: console.log(`⚠️ Schema is neither union nor object pattern`);
      return fields;
    }

    const objectContent = objectMatch[1];

    // Find field definitions using a more robust approach
    const fieldRegex = /(?:(\w+)|["']([^"']+)["'])\s*:\s*/g;
    let match;

    while ((match = fieldRegex.exec(objectContent)) !== null) {
      const fieldName = match[1] || match[2];
      const fieldStartIndex = fieldRegex.lastIndex;

      if (
        fieldName &&
        ![
          'object',
          'string',
          'number',
          'boolean',
          'array',
          'union',
          'enum',
          'any',
          'optional',
          'describe',
          'passthrough',
          'min',
          'max',
          'int',
          'gte',
        ].includes(fieldName)
      ) {
        // Extract the complete field definition using balanced bracket parsing
        const fieldDef = extractFieldDefinition(objectContent, fieldStartIndex);

        if (fieldDef) {
          // Clean up the field definition
          const cleanFieldDef = fieldDef.replace(/,\s*$/, '').trim();
          if (cleanFieldDef) {
            fields.set(fieldName, cleanFieldDef);
          }
        }
      }
    }
  } catch (error) {
    console.warn('Error extracting fields from schema:', error.message);
  }

  return fields;
}

/**
 * Extract fields from a union member schema by looking it up in the schemas file
 */
function extractFieldsFromUnionMember(schemaName) {
  const fields = new Map();
  
  try {
    if (fs.existsSync(SCHEMAS_OUTPUT_PATH)) {
      const schemasContent = fs.readFileSync(SCHEMAS_OUTPUT_PATH, 'utf8');
      
      // Find the union member schema definition
      const escapedSchemaName = schemaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const schemaRegex = new RegExp(
        `export const ${escapedSchemaName} = z\\s*([\\s\\S]*?)(?=\\nexport const |\\n$)`,
        'm'
      );
      const match = schemasContent.match(schemaRegex);
      
      if (match) {
        const memberSchemaDefinition = match[1];
        // Uncomment for debugging: console.log(`🔍 Processing union member ${schemaName}`);
        
        // Recursively extract fields from this member (handles nested objects)
        const memberFields = extractFieldsFromSchema(memberSchemaDefinition);
        return memberFields;
      } else {
        // Uncomment for debugging: console.log(`⚠️ Could not find union member schema: ${schemaName}`);
      }
    }
  } catch (error) {
    console.warn(`Error extracting fields from union member ${schemaName}:`, error.message);
  }
  
  return fields;
}

/**
 * Read Kibana API body parameter definitions by extracting from schemas dynamically
 * This "explodes" any body schema to get all its fields (like ES connectors approach)
 */
function readKibanaBodyDefinitions(operationId, endpoint) {
  const bodyParams = new Set();

  try {
    // Look for body parameters in the endpoint parameters array
    if (endpoint.parameters) {
      for (const param of endpoint.parameters) {
        if (param.type === 'Body' && param.schema) {
          // The schema is a reference to the actual schema object, not a string
          // We need to extract the schema name from the reference
          let schemaName;
          
          // Handle different ways the schema might be represented
          if (typeof param.schema === 'string') {
            schemaName = param.schema;
          } else if (param.schema && typeof param.schema === 'object') {
            // If it's an object reference, try to extract the name from the raw content
            // Look for the schema name in the raw endpoint content
            const rawContent = endpoint.rawContent || '';
            const schemaMatch = rawContent.match(/schema:\s*([A-Za-z_][A-Za-z0-9_]*)/);
            if (schemaMatch) {
              schemaName = schemaMatch[1];
            }
          }
          
          if (!schemaName) {
            console.warn(`⚠️ Could not determine schema name for ${operationId} body parameter`);
            continue;
          }

          // Uncomment for debugging: console.log(`🔍 Processing ${operationId} with body schema ${schemaName}`);

          // Read the generated schemas file to get the actual schema definition
          if (fs.existsSync(SCHEMAS_OUTPUT_PATH)) {
            const schemasContent = fs.readFileSync(SCHEMAS_OUTPUT_PATH, 'utf8');

            // Find the schema definition - escape special regex characters in schema name
            const escapedSchemaName = schemaName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const schemaRegex = new RegExp(
              `export const ${escapedSchemaName} = z\\s*([\\s\\S]*?)(?=\\nexport const |\\n$)`,
              'm'
            );
            const match = schemasContent.match(schemaRegex);

            if (match) {
              const schemaDefinition = match[1];
              // Uncomment for debugging: console.log(`📋 Found schema definition for ${schemaName}:`, schemaDefinition.substring(0, 200) + '...');

              // Extract all fields from this schema
              const extractedFields = extractFieldsFromSchema(schemaDefinition);

              if (extractedFields.size > 0) {
                // Uncomment for debugging: console.log(`📋 Exploded ${schemaName} → ${extractedFields.size} fields:`, Array.from(extractedFields.keys()));
                // Return both field names for bodyParams and the field definitions for schema generation
                const fieldNames = Array.from(extractedFields.keys());
                const fieldDefs = extractedFields;

                // Store field definitions for later use in schema generation
                for (const fieldName of fieldNames) {
                  bodyParams.add(fieldName);
                }

                // Attach the field definitions to the result for schema generation
                const result = Array.from(bodyParams);
                result._fieldDefinitions = fieldDefs;
                return result;
              } else {
                // Uncomment for debugging: console.log(`⚠️ No fields found in ${schemaName} - schema type might not be supported`);
              }
            } else {
              // Uncomment for debugging: console.log(`⚠️ Could not find schema definition for ${schemaName}`);
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn(`⚠️ Error extracting body params for ${operationId}:`, error.message);
  }

  return Array.from(bodyParams);
}

// Note: Complex schema parsing functions removed - now using hardcoded mappings like ES connectors

/**
 * Convert Kibana API endpoint to connector definition
 */
function convertToConnectorDefinition(endpoint, index, tagDocs) {
  const { method, path, operationId, parameters = [], examples = {} } = endpoint;

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

  // Add path parameters (always required)
  for (const param of pathParams) {
    schemaFields.push(
      `    ${safeParamName(param)}: z.string().describe('Path parameter: ${param} (required)'),`
    );
  }

  // Add query parameters (optional)
  for (const param of queryParams) {
    schemaFields.push(
      `    ${safeParamName(param)}: z.any().optional().describe('Query parameter: ${param}'),`
    );
  }

  // Add header parameters (usually required but make optional for flexibility)
  for (const param of headerParams) {
    schemaFields.push(
      `    ${safeParamName(param)}: z.string().optional().describe('Header parameter: ${param}'),`
    );
  }

  // Get body parameters using hardcoded definitions (like ES connectors)
  const bodyParamNames = readKibanaBodyDefinitions(operationId, endpoint);

  // Extract and flatten body schema parameters (like ES connectors approach)
  const bodySchemaFields = [];
  const flattenedBodyParams = []; // Track the actual flattened parameter names

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    // Check if we have field definitions (actual Zod schemas) attached
    const fieldDefinitions = bodyParamNames._fieldDefinitions;

    if (fieldDefinitions && fieldDefinitions.size > 0) {
      // Use actual Zod schemas from the original schema definition
      for (const paramName of bodyParamNames) {
        const safeFieldName = safeParamName(paramName);
        const originalZodDef = fieldDefinitions.get(paramName);

        if (originalZodDef) {
          // For now, use safe generic schema to avoid syntax errors
          // TODO: Fix complex field extraction later
          bodySchemaFields.push(
            `    ${safeFieldName}: z.any().optional().describe('${paramName} parameter'),`
          );
        } else {
          // Fallback to generic if definition not found
          bodySchemaFields.push(
            `    ${safeFieldName}: z.any().optional().describe('${paramName} parameter'),`
          );
        }
        flattenedBodyParams.push(paramName);
      }
    } else if (bodyParamNames.length > 0) {
      // Fallback: use generic z.any().optional() if no field definitions available
      for (const paramName of bodyParamNames) {
        const safeFieldName = safeParamName(paramName);
        bodySchemaFields.push(
          `    ${safeFieldName}: z.any().optional().describe('${paramName} parameter'),`
        );
        flattenedBodyParams.push(paramName);
      }
    } else {
      // No specific body parameters found, add a generic body parameter
      bodySchemaFields.push(`    body: z.any().optional().describe('Request body'),`);
      flattenedBodyParams.push('body');
    }
  }

  // Add the flattened body fields to the main schema
  schemaFields.push(...bodySchemaFields);

  // Update bodyParams to reflect the flattened structure
  bodyParams.length = 0; // Clear original
  bodyParams.push(...flattenedBodyParams);

  // If no specific query params found but it's a GET request, add generic query support
  if (method === 'GET' && queryParams.length === 0) {
    schemaFields.push(`    query: z.record(z.any()).optional().describe('Query parameters'),`);
    queryParams.push('query');
  }

  // Determine connector type
  const type = `kibana.${operationId}`;

  // Create description
  const description = `${method} ${path} - Kibana API endpoint`;

  // Extract documentation URL
  const documentation = generateDocumentationUrl(method, path, operationId, tagDocs);

  // Convert Zodios path format (:param) to our pattern format ({param})
  const pattern = path.replace(/:([^\/]+)/g, '{$1}');

  // Create examples object if we have examples
  const examplesSection =
    Object.keys(examples.requestParams || {}).length > 0
      ? `,
    examples: {
      params: ${JSON.stringify(examples.requestParams, null, 6)},
      snippet: \`- name: ${operationId.replace(/[^a-zA-Z0-9]/g, '_')}
  type: ${type}
  with:${Object.entries(examples.requestParams)
    .map(
      ([key, value]) =>
        `\n    ${key}: ${typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}`
    )
    .join('')}\`
    }`
      : '';

  return `  {
    type: '${type}',
    connectorIdRequired: false,
    description: '${description}',
    methods: ["${method}"],
    patterns: ["${pattern}"],
    isInternal: true,
    documentation: ${documentation ? `'${documentation}'` : 'null'},
    parameterTypes: {
      pathParams: ${JSON.stringify(pathParams)},
      urlParams: ${JSON.stringify([...queryParams, ...headerParams])},
      bodyParams: ${JSON.stringify(bodyParams)}
    },
    paramsSchema: z.object({
${schemaFields.join('\n')}
    }),
    outputSchema: z.any().describe('Response from ${operationId} API')${examplesSection}
  }`;
}

/**
 * Copy the entire generated client file as our schemas file
 */
function copyClientAsSchemas() {
  console.log(`📋 Copying generated client as schemas file`);

  // Read the temp file content
  const clientContent = fs.readFileSync(TEMP_OUTPUT_PATH, 'utf8');

  // Replace imports to use @kbn/zod instead of zod
  const modifiedContent = clientContent
    .replace(/import { z } from 'zod';/, "import { z } from '@kbn/zod';")
    .replace(
      /import { makeApi, Zodios, type ZodiosOptions } from '@zodios\/core';/,
      '// Zodios imports removed for schemas file'
    );

  // Extract just the schema definitions, make them all exports, remove the API client parts
  const lines = modifiedContent.split('\n');
  const schemaLines = [];
  let inEndpointsSection = false;

  for (const line of lines) {
    // Skip the endpoints and API client sections
    if (line.includes('const endpoints = makeApi')) {
      inEndpointsSection = true;
      continue;
    }

    if (inEndpointsSection) {
      continue; // Skip everything after endpoints definition
    }

    // Skip the export objects at the end (schemas, api, createApiClient)
    if (
      line.includes('export const schemas =') ||
      line.includes('export const api =') ||
      line.includes('export function createApiClient')
    ) {
      break; // Stop processing once we hit the export section
    }

    // Convert all const declarations to export const and apply patches
    if (line.match(/^const\s+[a-zA-Z0-9_]+\s*=/)) {
      // This is the start of a const declaration - mark it and continue
      let processedLine = line.replace(/^const\s+/, 'export const ');
      processedLine = applyPatches(processedLine);

      // Add ESLint ignore comment for naming convention before each schema export
      schemaLines.push('// eslint-disable-next-line @typescript-eslint/naming-convention');
      schemaLines.push(processedLine);
    } else if (
      line.trim() !== '' &&
      !line.match(/^\/\//) &&
      !line.match(/^\/\*/) &&
      !line.match(/^export\s+/) &&
      !line.match(/^const\s+/)
    ) {
      // This is a continuation line (part of a multi-line const declaration or other code)
      const processedLine = applyPatches(line);
      schemaLines.push(processedLine);
    } else if (line.trim() === '' || line.match(/^\/\//) || line.match(/^\/\*/)) {
      // Keep comments and empty lines as-is
      schemaLines.push(line);
    }
  }

  function applyPatches(line) {
    let processedLine = line;

    // Patch 1: Replace problematic discriminatedUnion calls with regular union
    if (processedLine.includes("z.discriminatedUnion('type',")) {
      processedLine = processedLine.replace(/z\.discriminatedUnion\('type',/g, 'z.union(');
    }

    // Patch 2: Replace references to browser/Node built-in types that don't exist in zod
    processedLine = processedLine.replace(/z\.instanceof\(File\)/g, 'z.any()'); // File API

    // Patch 3: Replace undefined schema references with z.any()
    const undefinedRefs = ['UNENROLL', 'UPGRADE', 'POLICY_REASSIGN', 'SETTINGS', 'CPU'];
    undefinedRefs.forEach((ref) => {
      const regex = new RegExp(`\\b${ref}\\b(?!\\s*=)`, 'g');
      processedLine = processedLine.replace(regex, 'z.any()');
    });

    // Patch 4: Fix cases where schema reference is missing/undefined
    processedLine = processedLine.replace(/\bundefined\.optional\(\)/g, 'z.any().optional()');
    processedLine = processedLine.replace(/\bundefined\.describe\(/g, 'z.any().describe(');
    processedLine = processedLine.replace(/:\s*\.optional\(\)/g, ': z.any().optional()');
    processedLine = processedLine.replace(/:\s*\.describe\(/g, ': z.any().describe(');

    // Patch 5: Fix bare z.optional() calls that have no arguments (causes TS2554 error)
    // This happens when openapi-zod-client generates invalid calls like "body: z.optional()"
    // Replace with z.any().optional() to fix TypeScript compilation errors
    processedLine = processedLine.replace(/\bz\.optional\(\)/g, 'z.any().optional()');

    return processedLine;
  }

  // Validation: Check for potential undefined schema references
  const potentialIssues = [];
  schemaLines.forEach((line, index) => {
    // Look for common patterns that might cause "_def" errors
    if (line.includes('.optional()') && line.includes('undefined')) {
      potentialIssues.push(`Line ${index + 1}: Potential undefined.optional() call`);
    }
    if (line.includes('z.union([') && line.includes('undefined')) {
      potentialIssues.push(`Line ${index + 1}: Potential undefined in union`);
    }
  });

  if (potentialIssues.length > 0) {
    console.log(`⚠️ Found ${potentialIssues.length} potential schema issues:`);
    potentialIssues.slice(0, 5).forEach((issue) => console.log(`  - ${issue}`));
    if (potentialIssues.length > 5) {
      console.log(`  ... and ${potentialIssues.length - 5} more`);
    }
  }

  // No safe schema wrapper needed - fix the root cause instead

  const schemaFileContent = `/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 * 
 * This file contains Zod schema definitions extracted from the Kibana OpenAPI specification.
 * Generated at: ${new Date().toISOString()}
 * Source: Kibana OpenAPI spec via openapi-zod-client (complete schemas)
 * 
 * To regenerate: npm run generate:kibana-connectors
 */

import { z } from '@kbn/zod';

${schemaLines.filter((line) => !line.includes("import { z } from '@kbn/zod';")).join('\n')}
`;

  fs.writeFileSync(SCHEMAS_OUTPUT_PATH, schemaFileContent, 'utf8');
  console.log(`📄 Generated schemas file: ${SCHEMAS_OUTPUT_PATH}`);

  return true;
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

    // Copy schemas FIRST so they're available during endpoint processing
    copyClientAsSchemas();

    // Extract tag documentation
    const tagDocs = extractTagDocumentation();

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
        const connectorDef = convertToConnectorDefinition(endpoint, successCount, tagDocs);
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

    // Extract unique schemas used in connectors
    const usedSchemas = new Set();

    // First, collect schemas from original endpoint parameters
    for (const endpoint of endpoints) {
      for (const param of endpoint.parameters || []) {
        if (param.schema && param.schema !== 'z.any()' && !param.schema.startsWith('z.')) {
          // Clean the schema name - remove method calls like .nullish(), .optional()
          const cleanSchemaName = param.schema.split('.')[0];
          usedSchemas.add(cleanSchemaName);
        }
      }
    }

    // Second, collect schemas from the connector definitions (field definitions)
    const connectorContent = connectorDefinitions.join(',\n');

    // Extract schema references from connector content using regex
    const schemaRefRegex = /([A-Z][a-zA-Z0-9_]*(?:_[A-Z][a-zA-Z0-9_]*)*)\./g;
    let match;
    while ((match = schemaRefRegex.exec(connectorContent)) !== null) {
      const schemaName = match[1];
      // Include all schema references - we'll filter later based on what exists
      if (schemaName !== 'z' && schemaName !== 'ZodType' && schemaName !== 'ZodSchema') {
        usedSchemas.add(schemaName);
      }
    }

    // Schemas already copied earlier

    // Generate schema imports section - only import schemas that actually exist
    const actualUsedSchemas = Array.from(usedSchemas).filter(
      (s) => s !== 'z' && s !== 'ZodType' && s !== 'ZodSchema'
    );

    // Read the schemas file to verify which schemas actually exist
    const schemasFileContent = fs.readFileSync(SCHEMAS_OUTPUT_PATH, 'utf8');
    const existingSchemas = actualUsedSchemas.filter((schemaName) => {
      return schemasFileContent.includes(`export const ${schemaName} =`);
    });

    const missingSchemas = actualUsedSchemas.filter(
      (schemaName) => !existingSchemas.includes(schemaName)
    );

    if (missingSchemas.length > 0) {
      console.log(`⚠️ Skipping import of ${missingSchemas.length} missing schemas:`);
      missingSchemas.slice(0, 5).forEach((schema) => console.log(`  - ${schema}`));
      if (missingSchemas.length > 5) {
        console.log(`  ... and ${missingSchemas.length - 5} more`);
      }
    }

    const schemaImportsSection =
      existingSchemas.length > 0
        ? `\n// Import schemas from generated schemas file\n// eslint-disable-next-line @typescript-eslint/naming-convention\nimport {\n  ${existingSchemas.join(
            ',\n  '
          )}\n} from './generated_kibana_schemas';\n`
        : '';

    // Generate the TypeScript file
    let fileContent = `/*
 * AUTO-GENERATED FILE - DO NOT EDIT
 * 
 * This file contains Kibana connector definitions generated from the Kibana OpenAPI specification.
 * Generated at: ${new Date().toISOString()}
 * Source: Kibana OpenAPI spec (${successCount} APIs)
 * 
 * To regenerate: npm run generate:kibana-connectors
 */

import { z } from '@kbn/zod';
import type { InternalConnectorContract } from '@kbn/workflows';${schemaImportsSection}
export const GENERATED_KIBANA_CONNECTORS: InternalConnectorContract[] = [
${connectorDefinitions.join(',\n')}
];

export const KIBANA_CONNECTOR_COUNT = ${successCount};
`;

    // FINAL PATCH: Fix bare z.optional() calls that cause TypeScript TS2554 errors
    // This happens when schema names are empty/undefined, resulting in "body: z.optional()"
    // Replace with "body: z.any().optional()" to fix compilation errors
    fileContent = fileContent.replace(/:\s*z\.optional\(\)/g, ': z.any().optional()');

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

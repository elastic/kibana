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
  '../../../../plugins/shared/console/server/lib/spec_definitions/json/generated'
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
 * Read Console API definition files to extract body parameter schemas
 * Also includes hardcoded definitions for common APIs within workflows scope
 */
function readConsoleBodyDefinitions(endpointName) {
  const bodyParams = new Set();

  // Hardcoded body parameters for common ES APIs (within workflows scope)
  const commonBodyParams = {
    search: [
      'query',
      'size',
      'from',
      'sort',
      'aggs',
      'aggregations',
      'post_filter',
      'highlight',
      '_source',
      'fields',
      'track_total_hits',
      'timeout',
    ],
    msearch: [
      'query',
      'size',
      'from',
      'sort',
      'aggs',
      'aggregations',
      'post_filter',
      'highlight',
      '_source',
      'index',
    ],
    index: ['document'],
    update: ['doc', 'script', 'upsert', 'doc_as_upsert'],
    bulk: ['operations'],
    reindex: ['source', 'dest', 'script', 'conflicts'],
    update_by_query: ['query', 'script', 'conflicts'],
    delete_by_query: ['query', 'conflicts'],
    // Index management APIs
    'indices.create': ['mappings', 'settings', 'aliases'],
    'indices.put_mapping': ['properties', 'dynamic', 'meta'],
    'indices.put_settings': ['settings'],
    'indices.put_template': ['template', 'mappings', 'settings', 'aliases'],
    'indices.put_index_template': ['template', 'composed_of', 'priority', 'version'],
    // Document APIs
    create: ['document'],
    delete: [],
    get: [],
    exists: [],
    // Cluster APIs
    'cluster.put_settings': ['persistent', 'transient'],
    'cluster.health': [],
    // Node APIs
    'nodes.info': [],
    'nodes.stats': [],
  };

  // Check hardcoded definitions first
  if (commonBodyParams[endpointName]) {
    for (const param of commonBodyParams[endpointName]) {
      bodyParams.add(param);
    }
  }

  // Look for override files (they have data_autocomplete_rules)
  const overridePath = path.resolve(
    __dirname,
    '../../../plugins/shared/console/server/lib/spec_definitions/json/overrides',
    `${endpointName}.json`
  );

  if (fs.existsSync(overridePath)) {
    try {
      const content = JSON.parse(fs.readFileSync(overridePath, 'utf8'));
      const endpoint = content[endpointName];
      if (endpoint && endpoint.data_autocomplete_rules) {
        // Extract parameter names from data_autocomplete_rules
        for (const paramName of Object.keys(endpoint.data_autocomplete_rules)) {
          bodyParams.add(paramName);
        }
      }
    } catch (error) {
      // Ignore errors reading override files
    }
  }

  // If no body params found yet, try to infer from API name and patterns
  if (bodyParams.size === 0) {
    const inferredParams = inferBodyParamsFromApiName(endpointName);
    for (const param of inferredParams) {
      bodyParams.add(param);
    }
  }

  return Array.from(bodyParams);
}

/**
 * Intelligently infer body parameters from API endpoint name and common patterns
 */
function inferBodyParamsFromApiName(endpointName) {
  // Index management APIs
  if (endpointName.includes('indices.create') && !endpointName.includes('data_stream')) {
    return ['mappings', 'settings', 'aliases'];
  }
  if (endpointName.includes('indices.put_mapping')) {
    return ['properties', 'dynamic', 'meta'];
  }
  if (endpointName.includes('indices.put_settings')) {
    return ['settings'];
  }
  if (endpointName.includes('indices.put_template')) {
    return ['template', 'mappings', 'settings', 'aliases'];
  }
  if (endpointName.includes('indices.put_index_template')) {
    return ['template', 'composed_of', 'priority', 'version'];
  }
  if (endpointName.includes('indices.put_component_template')) {
    return ['template', 'version', 'meta'];
  }

  // Search APIs
  if (endpointName === 'search' || endpointName.includes('.search')) {
    return [
      'query',
      'size',
      'from',
      'sort',
      'aggs',
      'aggregations',
      'post_filter',
      'highlight',
      '_source',
      'fields',
      'track_total_hits',
    ];
  }
  if (endpointName.includes('msearch')) {
    return [
      'query',
      'size',
      'from',
      'sort',
      'aggs',
      'aggregations',
      'post_filter',
      'highlight',
      '_source',
      'index',
    ];
  }
  if (endpointName.includes('search_template')) {
    return ['template', 'params', 'explain', 'profile'];
  }

  // Document APIs
  if (endpointName === 'index' || endpointName.includes('.index')) {
    return ['document'];
  }
  if (
    endpointName === 'create' ||
    (endpointName.includes('.create') && !endpointName.includes('indices'))
  ) {
    return ['document'];
  }
  if (endpointName === 'update' || endpointName.includes('.update')) {
    return ['doc', 'script', 'upsert', 'doc_as_upsert'];
  }
  if (endpointName.includes('update_by_query')) {
    return ['query', 'script', 'conflicts'];
  }
  if (endpointName.includes('delete_by_query')) {
    return ['query', 'conflicts'];
  }
  if (endpointName.includes('reindex')) {
    return ['source', 'dest', 'script', 'conflicts'];
  }
  if (endpointName.includes('bulk')) {
    return ['operations'];
  }

  // Cluster APIs
  if (endpointName.includes('cluster.put_settings')) {
    return ['persistent', 'transient'];
  }
  if (endpointName.includes('cluster.put_component_template')) {
    return ['template', 'version', 'meta'];
  }

  // Security APIs
  if (endpointName.includes('security.put_user')) {
    return ['password', 'roles', 'full_name', 'email', 'metadata'];
  }
  if (endpointName.includes('security.put_role')) {
    return ['cluster', 'indices', 'applications', 'run_as', 'metadata'];
  }
  if (endpointName.includes('security.put_role_mapping')) {
    return ['roles', 'enabled', 'rules', 'metadata'];
  }

  // ML APIs
  if (endpointName.includes('ml.put_job')) {
    return ['job_id', 'description', 'analysis_config', 'data_description'];
  }
  if (endpointName.includes('ml.put_datafeed')) {
    return ['job_id', 'indices', 'query', 'frequency', 'scroll_size'];
  }

  // Watcher APIs
  if (endpointName.includes('watcher.put_watch')) {
    return ['trigger', 'input', 'condition', 'actions', 'metadata'];
  }

  // Transform APIs
  if (endpointName.includes('transform.put_transform')) {
    return ['source', 'dest', 'pivot', 'description', 'frequency'];
  }

  // Snapshot APIs
  if (endpointName.includes('snapshot.create')) {
    return ['indices', 'ignore_unavailable', 'include_global_state', 'metadata'];
  }
  if (endpointName.includes('snapshot.create_repository')) {
    return ['type', 'settings'];
  }

  // Ingest APIs
  if (endpointName.includes('ingest.put_pipeline')) {
    return ['description', 'processors', 'on_failure', 'version'];
  }

  // ESQL APIs
  if (endpointName.includes('esql.query')) {
    return ['query', 'columnar', 'locale', 'params', 'profile', 'filter'];
  }

  // If no specific pattern matches, check for common patterns in the name
  if (
    endpointName.includes('put_') ||
    endpointName.includes('post_') ||
    endpointName.includes('create')
  ) {
    // For PUT/POST/CREATE operations, there's usually a body
    return []; // Will fall back to generic body
  }

  // GET/DELETE operations typically don't have body parameters
  return [];
}

/**
 * Convert Console data_autocomplete_rules parameter to Zod schema string
 */
function convertBodyParamToZodString(paramName, isRequired = false) {
  const optionalSuffix = isRequired ? '' : '.optional()';
  const requiredMarker = isRequired ? ' (required)' : '';

  // Generate appropriate Zod schemas for common ES API parameters
  switch (paramName) {
    // ESQL-specific parameters
    case 'query':
      return `z.union([z.string(), z.object({}).passthrough()])${optionalSuffix}.describe('Query (ES-QL string or Elasticsearch Query DSL)${requiredMarker}')`;
    case 'columnar':
      return `z.boolean()${optionalSuffix}.describe('Return columnar results${requiredMarker}')`;
    case 'locale':
      return `z.string()${optionalSuffix}.describe('Locale for query execution${requiredMarker}')`;
    case 'params':
      return `z.array(z.any())${optionalSuffix}.describe('Query parameters${requiredMarker}')`;
    case 'profile':
      return `z.boolean()${optionalSuffix}.describe('Enable profiling${requiredMarker}')`;
    case 'filter':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Query filter${requiredMarker}')`;

    // Common search parameters
    case 'size':
      return `z.number()${optionalSuffix}.describe('Number of results to return${requiredMarker}')`;
    case 'from':
      return `z.number()${optionalSuffix}.describe('Starting offset${requiredMarker}')`;
    case 'sort':
      return `z.union([z.array(z.any()), z.object({}).passthrough()])${optionalSuffix}.describe('Sort specification${requiredMarker}')`;
    case 'aggs':
    case 'aggregations':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Aggregations${requiredMarker}')`;
    case 'post_filter':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Post filter${requiredMarker}')`;
    case 'highlight':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Highlighting configuration${requiredMarker}')`;
    case '_source':
      return `z.union([z.boolean(), z.array(z.string()), z.object({}).passthrough()])${optionalSuffix}.describe('Source field filtering${requiredMarker}')`;
    case 'fields':
      return `z.array(z.string())${optionalSuffix}.describe('Fields to return${requiredMarker}')`;
    case 'track_total_hits':
      return `z.union([z.boolean(), z.number()])${optionalSuffix}.describe('Track total hits${requiredMarker}')`;
    case 'timeout':
      return `z.string()${optionalSuffix}.describe('Query timeout${requiredMarker}')`;

    // Document operations
    case 'document':
    case 'doc':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Document content${requiredMarker}')`;
    case 'script':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Script configuration${requiredMarker}')`;
    case 'upsert':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Upsert document${requiredMarker}')`;
    case 'doc_as_upsert':
      return `z.boolean()${optionalSuffix}.describe('Use doc as upsert${requiredMarker}')`;

    // Bulk operations
    case 'operations':
      return `z.array(z.object({}).passthrough())${optionalSuffix}.describe('Bulk operations${requiredMarker}')`;

    // Reindex operations
    case 'source':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Source configuration${requiredMarker}')`;
    case 'dest':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Destination configuration${requiredMarker}')`;
    case 'conflicts':
      return `z.enum(['abort', 'proceed'])${optionalSuffix}.describe('Conflict resolution${requiredMarker}')`;

    // Index management parameters
    case 'mappings':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Index mappings${requiredMarker}')`;
    case 'settings':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Index settings${requiredMarker}')`;
    case 'aliases':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Index aliases${requiredMarker}')`;
    case 'properties':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Mapping properties${requiredMarker}')`;
    case 'dynamic':
      return `z.union([z.boolean(), z.enum(['strict'])])${optionalSuffix}.describe('Dynamic mapping${requiredMarker}')`;
    case 'meta':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Mapping metadata${requiredMarker}')`;
    case 'template':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Template configuration${requiredMarker}')`;
    case 'composed_of':
      return `z.array(z.string())${optionalSuffix}.describe('Component templates${requiredMarker}')`;
    case 'priority':
      return `z.number()${optionalSuffix}.describe('Template priority${requiredMarker}')`;
    case 'version':
      return `z.number()${optionalSuffix}.describe('Template version${requiredMarker}')`;

    // Cluster settings
    case 'persistent':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Persistent cluster settings${requiredMarker}')`;
    case 'transient':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Transient cluster settings${requiredMarker}')`;

    // Security parameters
    case 'password':
      return `z.string()${optionalSuffix}.describe('User password${requiredMarker}')`;
    case 'roles':
      return `z.array(z.string())${optionalSuffix}.describe('User roles${requiredMarker}')`;
    case 'full_name':
      return `z.string()${optionalSuffix}.describe('Full name${requiredMarker}')`;
    case 'email':
      return `z.string()${optionalSuffix}.describe('Email address${requiredMarker}')`;
    case 'metadata':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Metadata${requiredMarker}')`;
    case 'cluster':
      return `z.array(z.string())${optionalSuffix}.describe('Cluster privileges${requiredMarker}')`;
    case 'indices':
      return `z.array(z.object({}).passthrough())${optionalSuffix}.describe('Index privileges${requiredMarker}')`;
    case 'applications':
      return `z.array(z.object({}).passthrough())${optionalSuffix}.describe('Application privileges${requiredMarker}')`;
    case 'run_as':
      return `z.array(z.string())${optionalSuffix}.describe('Run as users${requiredMarker}')`;
    case 'enabled':
      return `z.boolean()${optionalSuffix}.describe('Enabled flag${requiredMarker}')`;
    case 'rules':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Mapping rules${requiredMarker}')`;

    // ML parameters
    case 'job_id':
      return `z.string()${optionalSuffix}.describe('Job ID${requiredMarker}')`;
    case 'description':
      return `z.string()${optionalSuffix}.describe('Description${requiredMarker}')`;
    case 'analysis_config':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Analysis configuration${requiredMarker}')`;
    case 'data_description':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Data description${requiredMarker}')`;
    case 'frequency':
      return `z.string()${optionalSuffix}.describe('Frequency${requiredMarker}')`;
    case 'scroll_size':
      return `z.number()${optionalSuffix}.describe('Scroll size${requiredMarker}')`;

    // Watcher parameters
    case 'trigger':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Watch trigger${requiredMarker}')`;
    case 'input':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Watch input${requiredMarker}')`;
    case 'condition':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Watch condition${requiredMarker}')`;
    case 'actions':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Watch actions${requiredMarker}')`;

    // Transform parameters
    case 'pivot':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Pivot configuration${requiredMarker}')`;

    // Snapshot parameters
    case 'ignore_unavailable':
      return `z.boolean()${optionalSuffix}.describe('Ignore unavailable indices${requiredMarker}')`;
    case 'include_global_state':
      return `z.boolean()${optionalSuffix}.describe('Include global state${requiredMarker}')`;
    case 'type':
      return `z.string()${optionalSuffix}.describe('Repository type${requiredMarker}')`;

    // Ingest parameters
    case 'processors':
      return `z.array(z.object({}).passthrough())${optionalSuffix}.describe('Pipeline processors${requiredMarker}')`;
    case 'on_failure':
      return `z.array(z.object({}).passthrough())${optionalSuffix}.describe('Failure processors${requiredMarker}')`;

    // Search template parameters
    case 'template':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Template configuration${requiredMarker}')`;
    case 'params':
      return `z.object({}).passthrough()${optionalSuffix}.describe('Template parameters${requiredMarker}')`;
    case 'explain':
      return `z.boolean()${optionalSuffix}.describe('Explain query${requiredMarker}')`;

    default:
      return `z.any()${optionalSuffix}.describe('${paramName}${requiredMarker}')`;
  }
}

/**
 * Generate connector contract for a single ES API
 */
function generateConnectorDefinition(endpointName, definition) {
  const type = `elasticsearch.${endpointName}`;
  const urlParams = definition.url_params || {};
  const patterns = definition.patterns || [];
  const methods = definition.methods || ['GET'];
  const documentation = definition.documentation || null;
  const description = `${methods.join('/')} ${patterns.join(' | ') || type} - ${
    Object.keys(urlParams).length
  } parameters`;

  // Build schema object and track parameter types
  const schemaFields = [];
  const pathParams = extractPathParameters(patterns);
  const urlParamNames = Object.keys(urlParams);
  const bodyParamNames = readConsoleBodyDefinitions(endpointName);
  const addedParams = new Set();

  // Add path parameters (required)
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

  // Add specific body parameters from Console definitions
  for (const paramName of bodyParamNames) {
    if (!addedParams.has(paramName)) {
      const zodDef = convertBodyParamToZodString(paramName, false);
      schemaFields.push(`    ${paramName}: ${zodDef},`);
      addedParams.add(paramName);
    }
  }

  // If no specific body parameters found, add a generic body parameter
  if (bodyParamNames.length === 0) {
    schemaFields.push(`    body: z.any().optional().describe('Request body'),`);
    bodyParamNames.push('body');
  }

  return `  {
    type: '${type}',
    connectorIdRequired: false,
    description: '${description}',
    methods: ${JSON.stringify(methods)},
    patterns: ${JSON.stringify(patterns)},
    isInternal: true,
    documentation: ${documentation ? `'${documentation}'` : 'null'},
    parameterTypes: {
      pathParams: ${JSON.stringify(pathParams)},
      urlParams: ${JSON.stringify(urlParamNames)},
      bodyParams: ${JSON.stringify(bodyParamNames)}
    },
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
import type { InternalConnectorContract } from '../spec/lib/generate_yaml_schema';

export const GENERATED_ELASTICSEARCH_CONNECTORS: InternalConnectorContract[] = [
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

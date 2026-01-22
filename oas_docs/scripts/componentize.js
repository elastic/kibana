/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/setup-node-env');
const path = require('node:path');
const fs = require('node:fs');
const { run } = require('@kbn/dev-cli-runner');
const yaml = require('js-yaml');
const { REPO_ROOT } = require('@kbn/repo-info');

// const COMPONENT_PREFIX = "$ref: '#/components/schemas/";

/**
- Traverse paths → methods → requests/responses
- Recursively find `oneOf`/`anyOf`/`allOf` at ANY depth
- Extract each item to `components/schemas`
- Replace with `$ref`
- Inpsired by promote_space_awareness.js
 */
/**
 * Creates a name generator for component schemas
 * Based on pattern from kbn-router-to-openapispec/src/util.ts
 */
// TODO: test!!!
const createComponentNameGenerator = () => {
  const nameMap = new Map();

  return function generateName(context, compositionType, index) {
    const { method, path, operationId, isRequest, responseCode, propertyPath = [] } = context;

    // Derive operation ID if not given
    let opId = operationId;
    if (!opId) {
      // gnarly path cleaning with regexes: TODO: ensure security concerns are addressed
      // cleans /api/alerting/rule/{rule_id}/alert/{alert_id}/_unmute
      // TODO: extract to util for easier testing
      const cleanPath = path
        // remove whitespace
        .trim()
        // remove leading slashes
        .replace(/^[\/]+/, '')
        // remove trailing slashes
        .replace(/[\/]+$/, '')
        // to lower case (in case of mixed case)
        .toLowerCase()
        // theoretically should skip /internal/
        .replace(/^(internal\/api\/|internal\/|api\/)/, '')
        // remove { } ? *
        .replace(/[\{\}\?\*]/g, '')
        // replace / and _ with -
        .replace(/[\/_]/g, '-')
        // collapse multiple -
        .replace(/[-]+/g, '-');
      opId = `${method.toLowerCase()}-${cleanPath}`;
    }

    // Build name parts
    // TODO: allow custom naming strategy via options
    // TODO: Ensure security-safe regex usage
    const parts = [
      opId.replace(/[^a-zA-Z0-9]/g, ''),
      isRequest ? 'Request' : 'Response',
      responseCode,
      ...propertyPath.map((p) => p.charAt(0).toUpperCase() + p.slice(1)),
    ].filter(Boolean);

    // Add composition type and index if applicable (arrays etc)
    if (compositionType && index !== undefined) {
      parts.push(`${index + 1}`);
    }

    let name = parts.join('_');

    // Ensure uniqueness
    const cachedCount = nameMap.get(name) ?? 0;
    nameMap.set(name, cachedCount + 1);
    if (cachedCount > 0) {
      name = `${name}_${cachedCount}`;
    }

    return name;
  };
};

/**
 * Main componentization function
 */
const componentizeObjectSchemas = async (relativeFilePath, { log = console } = {}) => {
  const absPath = path.resolve(REPO_ROOT, relativeFilePath);

  log.info(`Loading OAS document from ${absPath}`); // not needed
  const oasDoc = yaml.load(fs.readFileSync(absPath, 'utf8'));

  // Initialize components if needed
  if (!oasDoc.components) {
    oasDoc.components = {};
  }
  if (!oasDoc.components.schemas) {
    oasDoc.components.schemas = {};
  }

  const components = oasDoc.components.schemas;
  // utility to generate unique component names
  // TODO: allow custom naming strategy via options (using `meta.id` from raw schema)
  // TODO: extract to separate module if possible
  const nameGenerator = createComponentNameGenerator();
  const stats = {
    schemasExtracted: 0,
    oneOfCount: 0,
    anyOfCount: 0,
    allOfCount: 0,
    maxDepth: 0,
  };

  // utility to process schemas
  /**
   * Recursively process a schema, extracting compositions
   * @param {object} schema - The schema to process
   * @param {object} context - Contextual information (method, path, operationId, etc.)
   * @param {number} depth - Current recursion depth
   * TODO: extract if possible for easier testing
   */
  function processSchema(schema, context, depth = 0) {
    if (!schema || typeof schema !== 'object') {
      return;
    }

    // Track max depth
    stats.maxDepth = Math.max(stats.maxDepth, depth);

    // Prevent infinite recursion
    if (depth > 20) {
      log.warn(`Max depth reached at ${context.path || 'unknown path'}`);
      return;
    }

    // Process each composition type
    ['oneOf', 'anyOf', 'allOf'].forEach((compType) => {
      if (schema[compType] && Array.isArray(schema[compType])) {
        log.debug(
          `Found ${compType} with ${schema[compType].length} items at ${context.path || 'root'}`
        );

        schema[compType] = schema[compType].map((item, idx) => {
          // Skip if already a reference
          if (item.$ref) {
            return item;
          }

          // Generate component name
          const name = nameGenerator(context, compType, idx);

          // Check for name collision
          if (components[name]) {
            log.warn(`Component name collision: ${name} - appending counter`);
          }

          // Add to components
          components[name] = item;
          stats.schemasExtracted++;

          if (compType === 'oneOf') stats.oneOfCount++;
          if (compType === 'anyOf') stats.anyOfCount++;
          if (compType === 'allOf') stats.allOfCount++;

          log.debug(`  Extracted ${name}`);

          // Recursively process the extracted item
          processSchema(item, { ...context, depth: depth + 1 }, depth + 1);

          // Return reference
          return { $ref: `#/components/schemas/${name}` };
        });
      }
    });

    // Recurse into properties
    if (schema.properties && typeof schema.properties === 'object') {
      Object.entries(schema.properties).forEach(([propName, propSchema]) => {
        processSchema(
          propSchema,
          {
            ...context,
            propertyPath: [...(context.propertyPath || []), propName],
            path: `${context.path || ''}.properties.${propName}`,
          },
          depth + 1
        );
      });
    }

    // Recurse into array items
    if (schema.items) {
      processSchema(
        schema.items,
        {
          ...context,
          inArray: true,
          path: `${context.path || ''}.items`,
        },
        depth + 1
      );
    }

    // Recurse into additionalProperties if it's a schema
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      processSchema(
        schema.additionalProperties,
        {
          ...context,
          path: `${context.path || ''}.additionalProperties`,
        },
        depth + 1
      );
    }
  }

  // MAIN FLOW
  //Process all paths
  log.info('Processing paths...');
  // iitialize counters
  let pathCount = 0;
  let methodValueCount = 0;

  for (const [pathName, pathValue] of Object.entries(oasDoc.paths ?? {})) {
    pathCount++;
    log.debug(`Processing path: ${pathName}`);

    for (const [method, methodValue] of Object.entries(pathValue)) {
      // Skip non-methodValue keys including existing `$ref`s (don't overwrite refs)
      if (['parameters', 'servers', 'description', 'summary', '$ref'].includes(method)) {
        continue;
      }

      methodValueCount++;
      const baseContext = {
        method,
        path: pathName,
        operationId: methodValue.operationId,
        propertyPath: [],
      };

      log.debug(`  Processing method: ${method.toUpperCase()}`);

      // Process request body if method supports request content (put, post, patch)
      // content typically has 'application/json', '
      if (methodValue.requestBody?.content) {
        // what if content doesn't exist or is empty?, then the forEach will throw error**
        // content is next level and is the actual orkd 'content' in the yaml.
        // e.g post:requestBody.content.'application/json': { schema: {...} }
        // contentType is e.g 'application/json' or multipart/form-data.
        // responses contain `text/event-stream`
        // contentTypeObj typically has 'schema' & examples
        Object.entries(methodValue.requestBody.content).forEach(([contentType, contentTypeObj]) => {
          // not all request bodies have schema, e.g text/plain
          if (contentTypeObj.schema) {
            log.debug(`    Processing request body (${contentType})`);
            processSchema(contentTypeObj.schema, {
              ...baseContext,
              isRequest: true,
              path: `${pathName}.${method}.requestBody.content.${contentType}.schema`,
            });
          }
        });
      }

      // Process responses:
      // responses:
      //   statusCode:
      //    content:
      //     contentType (e.g application/json, text/event-stream, ): contentValue
      // contentValue typically has 'schema' & 'examples'
      // TODO: gnarly nested structure -> optimize later**
      if (methodValue.responses) {
        Object.entries(methodValue.responses).forEach(([statusCode, response]) => {
          if (response.content) {
            Object.entries(response.content).forEach(([contentType, contentTypeObj]) => {
              if (contentTypeObj.schema) {
                log.debug(`    Processing response ${statusCode} (${contentType})`);
                processSchema(contentTypeObj.schema, {
                  ...baseContext,
                  isRequest: false,
                  responseCode: statusCode,
                  path: `${pathName}.${method}.responses.${statusCode}.content.${contentType}.schema`,
                });
              }
            });
          }
        });
      }
    }
  }

  // Write results
  // Should we write to a prototypedocument, similar to merge?
  log.info(`Writing componentized schemas to ${absPath}`);
  fs.writeFileSync(absPath, yaml.dump(oasDoc, { noRefs: true, lineWidth: -1 }), 'utf8');

  // Log stats for dev
  log.info('Componentization complete!');
  log.info(`  Paths processed: ${pathCount}`);
  log.info(`  Operations processed: ${methodValueCount}`);
  log.info(`  Schemas extracted: ${stats.schemasExtracted}`);
  log.info(`  oneOf: ${stats.oneOfCount}`);
  log.info(`  anyOf: ${stats.anyOfCount}`);
  log.info(`  allOf: ${stats.allOfCount}`);
  log.info(`  Max depth: ${stats.maxDepth}`);
};

// CLI runner - only run when executed directly, not when required as a module
if (require.main === module) {
  run(
    async ({ log, flagsReader }) => {
      const [relativeFilePath] = flagsReader.getPositionals();
      await componentizeObjectSchemas(relativeFilePath, { log });
    },
    {
      description: 'Extract object schemas to referenced components in a given OAS file.',
      usage: 'node scripts/componentize.js <path-to-kbn-oas-file>',
    }
  );
}

module.exports = { componentizeObjectSchemas };

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const yaml = require('js-yaml');
const { REPO_ROOT } = require('@kbn/repo-info');
const { createComponentNameGenerator } = require('./component_name_generator');
const { createProcessSchema } = require('./process_schema');

/**
 * Deep clone helper to avoid mutating original object
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

/**
 * Main componentization function
 * Traverses an OpenAPI document and extracts inline schemas into reusable components.
 *
 * Process:
 * 1. Extracts top-level request/response schemas if they have properties or composition types
 * 2. Recursively processes nested schemas (properties, array items, additionalProperties)
 * 3. Extracts oneOf/anyOf/allOf items into separate components
 * 4. Processes pre-existing components in the document
 *
 * @param {string} relativeFilePath - Path to OAS YAML file relative to repository root
 * @param {Object} options - Configuration options
 * @param {Object} options.log - Logger instance with info/debug/warn/error methods (defaults to console)
 * @returns {Promise<void>}
 *
 * @example
 * // Componentize a single file
 * await componentizeObjectSchemas('oas_docs/bundle.yaml', { log: customLogger });
 */
const componentizeObjectSchemas = async (relativeFilePath, { log = console } = {}) => {
  const absPath = path.resolve(REPO_ROOT, relativeFilePath);
  let tempFilePath = null;

  try {
    log.info(`Loading OAS document from ${absPath}`);
    const originalDoc = yaml.load(fs.readFileSync(absPath, 'utf8'));

    // Work on a deep copy to avoid mutations
    const oasDoc = deepClone(originalDoc);

    // Initialize components if needed
    if (!oasDoc.components) {
      oasDoc.components = {};
    }
    if (!oasDoc.components.schemas) {
      oasDoc.components.schemas = {};
    }

    const components = oasDoc.components.schemas;
    // utility to generate unique component names
    const nameGenerator = createComponentNameGenerator();
    const stats = {
      schemasExtracted: 0,
      oneOfCount: 0,
      anyOfCount: 0,
      allOfCount: 0,
      maxDepth: 0,
    };

    // Create the schema processor with proper context
    const processSchema = createProcessSchema(components, nameGenerator, stats, log);

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
        // Only process HTTP method operations (skip path-level properties)
        const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];
        if (!HTTP_METHODS.includes(method.toLowerCase())) {
          continue;
        }

        methodValueCount++;
        const baseContext = {
          method,
          path: pathName,
          operationId: methodValue.operationId,
          propertyPath: [],
        };

        log.debug(`Processing method: ${method.toUpperCase()}`); // upper case is easier to read in logs

        // Process request body if method supports request content (put, post, patch)
        if (methodValue.requestBody?.content) {
          Object.entries(methodValue.requestBody.content).forEach(
            ([contentType, contentTypeObj]) => {
              if (contentTypeObj.schema) {
                log.debug(`Processing request body (${contentType})`);
                const schema = contentTypeObj.schema;

                // Extract top-level schema if it's an object with properties or has composition types
                // Objects need properties; composition types (oneOf/anyOf/allOf) don't need to be objects
                if (
                  !schema.$ref &&
                  ((schema.type === 'object' && schema.properties) ||
                    schema.oneOf ||
                    schema.anyOf ||
                    schema.allOf)
                ) {
                  const requestContext = {
                    ...baseContext,
                    isRequest: true,
                  };
                  const name = nameGenerator(requestContext);

                  if (components[name]) {
                    log.warn(`Component name collision: ${name} - appending counter`);
                  }

                  components[name] = deepClone(schema);
                  stats.schemasExtracted++;
                  log.debug(`Extracted top-level request schema ${name}`);

                  // Replace with reference
                  contentTypeObj.schema = { $ref: `#/components/schemas/${name}` };

                  // Now recursively process the extracted component with fresh context
                  // Reset propertyPath since this is now a standalone component
                  processSchema(components[name], {
                    method: baseContext.method,
                    path: baseContext.path,
                    operationId: baseContext.operationId,
                    isRequest: true,
                    propertyPath: [],
                  });
                } else {
                  // Not extractable, just process recursively
                  processSchema(schema, {
                    ...baseContext,
                    isRequest: true,
                  });
                }
              }
            }
          );
        }

        // Process responses
        if (methodValue.responses) {
          Object.entries(methodValue.responses).forEach(([statusCode, response]) => {
            if (response.content) {
              Object.entries(response.content).forEach(([contentType, contentTypeObj]) => {
                if (contentTypeObj.schema) {
                  log.debug(`Processing response ${statusCode} (${contentType})`);
                  const schema = contentTypeObj.schema;

                  // Extract top-level schema if it's an object with properties or has composition types
                  // Objects need properties; composition types (oneOf/anyOf/allOf) don't need to be objects
                  if (
                    !schema.$ref &&
                    ((schema.type === 'object' && schema.properties) ||
                      schema.oneOf ||
                      schema.anyOf ||
                      schema.allOf)
                  ) {
                    const responseContext = {
                      ...baseContext,
                      isRequest: false,
                      responseCode: statusCode,
                    };
                    const name = nameGenerator(responseContext);

                    if (components[name]) {
                      log.warn(`Component name collision: ${name} - appending counter`);
                    }

                    components[name] = deepClone(schema);
                    stats.schemasExtracted++;
                    log.debug(`Extracted top-level response schema ${name}`);

                    // Replace with reference
                    contentTypeObj.schema = { $ref: `#/components/schemas/${name}` };

                    // Now recursively process the extracted component with fresh context
                    // Reset propertyPath since this is now a standalone component
                    processSchema(components[name], {
                      method: baseContext.method,
                      path: baseContext.path,
                      operationId: baseContext.operationId,
                      isRequest: false,
                      responseCode: statusCode,
                      propertyPath: [],
                    });
                  } else {
                    // Not extractable, just process recursively
                    processSchema(schema, {
                      ...baseContext,
                      isRequest: false,
                      responseCode: statusCode,
                    });
                  }
                }
              });
            }
          });
        }
      }
    }

    // Process pre-existing components (e.g., from overlays or manual additions)
    // Track which components existed before componentization to avoid infinite loops
    log.info('Processing existing components...');
    const preExistingComponentNames = Object.keys(components);
    const processedComponents = new Set();

    for (const componentName of preExistingComponentNames) {
      if (processedComponents.has(componentName)) {
        continue;
      }
      processedComponents.add(componentName);

      const componentSchema = components[componentName];
      log.debug(`Processing existing component: ${componentName}`);

      // Process this component to extract any nested inline schemas
      // Use a generic context since these components aren't tied to specific operations
      // Include parentComponentName so nested schemas get meaningful names
      processSchema(componentSchema, {
        method: null,
        path: null,
        operationId: null,
        isRequest: undefined,
        responseCode: null,
        propertyPath: [],
        parentComponentName: componentName,
      });
    }

    // Write to temporary file first
    tempFilePath = path.join(os.tmpdir(), `componentize-${Date.now()}-${path.basename(absPath)}`);
    log.debug(`Writing to temporary file: ${tempFilePath}`);
    fs.writeFileSync(tempFilePath, yaml.dump(oasDoc, { noRefs: true, lineWidth: -1 }), 'utf8');

    // If successful, replace original file
    log.info(`Writing componentized schemas to ${absPath}`);
    fs.copyFileSync(tempFilePath, absPath);
    fs.unlinkSync(tempFilePath);
    tempFilePath = null;

    // Log stats for dev
    log.info('Componentization complete!');
    log.info(`Paths processed: ${pathCount}`);
    log.info(`Operations processed: ${methodValueCount}`);
    log.info(`Schemas extracted: ${stats.schemasExtracted}`);
    log.info(`oneOf: ${stats.oneOfCount}`);
    log.info(`anyOf: ${stats.anyOfCount}`);
    log.info(`allOf: ${stats.allOfCount}`);
    log.info(`Max depth: ${stats.maxDepth}`);
  } catch (error) {
    log.error(`Error during componentization: ${error.message}`);
    // Clean up temp file if it exists
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      log.debug(`Cleaned up temporary file: ${tempFilePath}`);
    }
    throw error;
  }
};

module.exports = { componentizeObjectSchemas };

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
- Traverse paths → methods → requests/responses
- Extract top-level schemas first
- Recursively find `oneOf`/`anyOf`/`allOf` at ANY depth
- Extract each item to `components/schemas`
- Replace with `$ref`
- Inspired by promote_space_awareness.js
 */

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

        log.debug(`Processing method: ${method.toUpperCase()}`); // upper case is easier to read in logs

        // Process request body if method supports request content (put, post, patch)
        if (methodValue.requestBody?.content) {
          Object.entries(methodValue.requestBody.content).forEach(
            ([contentType, contentTypeObj]) => {
              if (contentTypeObj.schema) {
                log.debug(`Processing request body (${contentType})`);
                const schema = contentTypeObj.schema;

                // Extract top-level schema if it's an object with properties or compositions
                if (
                  !schema.$ref &&
                  schema.type === 'object' &&
                  (schema.properties || schema.oneOf || schema.anyOf || schema.allOf)
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

                  // Extract top-level schema if it's an object with properties or compositions
                  if (
                    !schema.$ref &&
                    schema.type === 'object' &&
                    (schema.properties || schema.oneOf || schema.anyOf || schema.allOf)
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

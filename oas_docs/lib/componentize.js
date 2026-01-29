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
const cloneDeep = require('lodash/cloneDeep');
const { REPO_ROOT } = require('@kbn/repo-info');
const { createComponentNameGenerator } = require('./component_name_generator');
const { createProcessSchema } = require('./process_schema');
const { STRATEGY_DEFAULTS, HTTP_METHODS } = require('./constants');

/**
 * Determines if a top-level schema should be extracted as a component.
 *
 * @param {Object} schema - The schema to check
 * @param {boolean} extractEmpty - Whether to extract empty object schemas
 * @returns {boolean} - True if schema should be extracted
 */
function shouldExtractTopLevelSchema(schema, extractEmpty) {
  return (
    !schema.$ref &&
    ((schema.type === 'object' && schema.properties) ||
      (extractEmpty && schema.type === 'object') ||
      schema.oneOf ||
      schema.anyOf ||
      schema.allOf)
  );
}

/**
 * Extracts a top-level schema as a component and replaces it with a $ref.
 *
 * @param {Object} schema - The schema to extract
 * @param {Object} contentTypeObj - The content type object containing the schema
 * @param {Object} baseContext - Base context for the operation
 * @param {Object} extractionContext - Additional context (isRequest, responseCode)
 * @param {Function} nameGenerator - Function to generate component names
 * @param {Object} components - The components.schemas object
 * @param {Object} stats - Statistics tracking object
 * @param {Object} log - Logger instance
 * @param {Function} processSchema - The schema processor function
 * @param {string} logType - Type for logging ('request' or 'response')
 */
function extractAndReplaceTopLevelSchema(
  schema,
  contentTypeObj,
  baseContext,
  extractionContext,
  nameGenerator,
  components,
  stats,
  log,
  processSchema,
  logType
) {
  const context = {
    ...baseContext,
    ...extractionContext,
  };
  const name = nameGenerator(context);

  if (components[name]) {
    log.warn(`Component name collision: ${name} - appending counter`);
  }

  const schemaToStore = cloneDeep(schema);
  components[name] = schemaToStore;
  stats.schemasExtracted++;
  log.debug(`Extracted top-level ${logType} schema ${name}`);

  contentTypeObj.schema = { $ref: `#/components/schemas/${name}` };

  processSchema(schemaToStore, {
    ...baseContext,
    ...extractionContext,
    propertyPath: [],
  });
}

/**
 * Processes request body schemas for a given method operation.
 *
 * @param {Object} methodValue - The method operation object
 * @param {Object} baseContext - Base context for the operation
 * @param {boolean} extractEmpty - Whether to extract empty object schemas
 * @param {Function} nameGenerator - Function to generate component names
 * @param {Object} components - The components.schemas object
 * @param {Object} stats - Statistics tracking object
 * @param {Object} log - Logger instance
 * @param {Function} processSchema - The schema processor function
 */
function processRequestBodySchemas(
  methodValue,
  baseContext,
  extractEmpty,
  nameGenerator,
  components,
  stats,
  log,
  processSchema
) {
  if (!methodValue.requestBody?.content) return;

  Object.entries(methodValue.requestBody.content).forEach(([contentType, contentTypeObj]) => {
    if (contentTypeObj.schema) {
      log.debug(`Processing request body (${contentType})`);
      const schema = contentTypeObj.schema;

      if (shouldExtractTopLevelSchema(schema, extractEmpty)) {
        extractAndReplaceTopLevelSchema(
          schema,
          contentTypeObj,
          baseContext,
          { isRequest: true },
          nameGenerator,
          components,
          stats,
          log,
          processSchema,
          'request'
        );
      } else {
        processSchema(schema, {
          ...baseContext,
          isRequest: true,
        });
      }
    }
  });
}

/**
 * Processes response schemas for a given method operation.
 *
 * @param {Object} methodValue - The method operation object
 * @param {Object} baseContext - Base context for the operation
 * @param {boolean} extractEmpty - Whether to extract empty object schemas
 * @param {Function} nameGenerator - Function to generate component names
 * @param {Object} components - The components.schemas object
 * @param {Object} stats - Statistics tracking object
 * @param {Object} log - Logger instance
 * @param {Function} processSchema - The schema processor function
 */
function processResponseSchemas(
  methodValue,
  baseContext,
  extractEmpty,
  nameGenerator,
  components,
  stats,
  log,
  processSchema
) {
  if (!methodValue.responses) return;

  Object.entries(methodValue.responses).forEach(([statusCode, response]) => {
    if (response.content) {
      Object.entries(response.content).forEach(([contentType, contentTypeObj]) => {
        if (contentTypeObj.schema) {
          log.debug(`Processing response ${statusCode} (${contentType})`);
          const schema = contentTypeObj.schema;

          if (shouldExtractTopLevelSchema(schema, extractEmpty)) {
            extractAndReplaceTopLevelSchema(
              schema,
              contentTypeObj,
              baseContext,
              { isRequest: false, responseCode: statusCode },
              nameGenerator,
              components,
              stats,
              log,
              processSchema,
              'response'
            );
          } else {
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

/**
 * Traverses an OpenAPI document and extracts inline schemas into reusable components.
 *
 * Extracts top-level request/response schemas, recursively processes nested schemas,
 * extracts oneOf/anyOf/allOf items, and processes pre-existing components.
 *
 * @param {string} relativeFilePath - Path to OAS YAML file relative to repository root
 * @param {Object} [options={}] - Configuration options
 * @param {Object} [options.log=console] - Logger instance with info/debug/warn/error methods
 * @param {boolean} [options.extractPrimitives=false] - Extract primitive properties as separate components
 * @param {boolean} [options.removeProperties=false] - Remove extracted properties from parent components
 * @param {boolean} [options.extractEmpty=true] - Extract empty object schemas { type: 'object' }
 * @returns {Promise<void>}
 *
 * @example
 * await componentizeObjectSchemas('oas_docs/bundle.yaml', { log: customLogger });
 *
 * @example
 * await componentizeObjectSchemas('oas_docs/bundle.yaml', {
 *   log: customLogger,
 *   extractPrimitives: true,
 *   removeProperties: true,
 *   extractEmpty: true
 * });
 */
const componentizeObjectSchemas = async (
  relativeFilePath,
  {
    log = console,
    extractPrimitives = STRATEGY_DEFAULTS.extractPrimitives,
    removeProperties = STRATEGY_DEFAULTS.removeProperties,
    extractEmpty = STRATEGY_DEFAULTS.extractEmpty,
  } = {}
) => {
  const absPath = path.resolve(REPO_ROOT, relativeFilePath);
  let tempFilePath = null;

  try {
    log.info(`Loading OAS document from ${absPath}`);
    const originalDoc = yaml.load(fs.readFileSync(absPath, 'utf8'));

    const oasDoc = cloneDeep(originalDoc);

    if (!oasDoc.components) {
      oasDoc.components = {};
    }
    if (!oasDoc.components.schemas) {
      oasDoc.components.schemas = {};
    }

    const components = oasDoc.components.schemas;
    const nameGenerator = createComponentNameGenerator();
    const stats = {
      schemasExtracted: 0,
      oneOfCount: 0,
      anyOfCount: 0,
      allOfCount: 0,
      maxDepth: 0,
    };

    const strategyOptions = {
      extractPrimitives,
      removeProperties,
      extractEmpty,
    };

    const processSchema = createProcessSchema(
      components,
      nameGenerator,
      stats,
      log,
      strategyOptions
    );

    log.info('Processing paths...');
    let pathCount = 0;
    let methodValueCount = 0;

    for (const [pathName, pathValue] of Object.entries(oasDoc.paths ?? {})) {
      pathCount++;
      log.debug(`Processing path: ${pathName}`);

      for (const [method, methodValue] of Object.entries(pathValue)) {
        if (!HTTP_METHODS.includes(method.toLowerCase())) {
          continue;
        }

        methodValueCount++;
        const baseContext = {
          method,
          path: pathName,
          propertyPath: [],
        };

        log.debug(`Processing method: ${method.toUpperCase()}`);

        processRequestBodySchemas(
          methodValue,
          baseContext,
          extractEmpty,
          nameGenerator,
          components,
          stats,
          log,
          processSchema
        );

        processResponseSchemas(
          methodValue,
          baseContext,
          extractEmpty,
          nameGenerator,
          components,
          stats,
          log,
          processSchema
        );
      }
    }

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

      processSchema(componentSchema, {
        method: null,
        path: null,
        isRequest: undefined,
        responseCode: null,
        propertyPath: [],
        parentComponentName: componentName,
      });
    }

    tempFilePath = path.join(os.tmpdir(), `componentize-${Date.now()}-${path.basename(absPath)}`);
    log.debug(`Writing to temporary file: ${tempFilePath}`);
    fs.writeFileSync(tempFilePath, yaml.dump(oasDoc, { noRefs: true, lineWidth: -1 }), 'utf8');

    log.info(`Writing componentized schemas to ${absPath}`);
    fs.copyFileSync(tempFilePath, absPath);
    fs.unlinkSync(tempFilePath);
    tempFilePath = null;

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
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      log.debug(`Cleaned up temporary file: ${tempFilePath}`);
    }
    throw error;
  }
};

module.exports = { componentizeObjectSchemas };

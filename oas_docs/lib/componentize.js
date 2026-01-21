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
const yaml = require('js-yaml');
const { REPO_ROOT } = require('@kbn/repo-info');
const { createComponentNameGenerator } = require('./component_name_generator');
const { createProcessSchema } = require('./process_schema');

/**
- Traverse paths → methods → requests/responses
- Recursively find `oneOf`/`anyOf`/`allOf` at ANY depth
- Extract each item to `components/schemas`
- Replace with `$ref`
- Inpsired by promote_space_awareness.js
 */

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
      // content typically has 'application/json', '
      if (methodValue.requestBody?.content) {
        Object.entries(methodValue.requestBody.content).forEach(([contentType, contentTypeObj]) => {
          if (contentTypeObj.schema) {
            log.debug(`Processing request body (${contentType})`);
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
                log.debug(`Processing response ${statusCode} (${contentType})`);
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
  // Should we write to a prototypedocument, similar to merge?, e.g
  log.info(`Writing componentized schemas to ${absPath}`);
  fs.writeFileSync(absPath, yaml.dump(oasDoc, { noRefs: true, lineWidth: -1 }), 'utf8');

  // Log stats for dev
  log.info('Componentization complete!');
  log.info(`Paths processed: ${pathCount}`);
  log.info(`Operations processed: ${methodValueCount}`);
  log.info(`Schemas extracted: ${stats.schemasExtracted}`);
  log.info(`oneOf: ${stats.oneOfCount}`);
  log.info(`anyOf: ${stats.anyOfCount}`);
  log.info(`allOf: ${stats.allOfCount}`);
  log.info(`Max depth: ${stats.maxDepth}`);
};

module.exports = { componentizeObjectSchemas };

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

const componentizeObjectSchemas = async (relativeFilePath, { log = console } = {}) => {
  const absPath = path.resolve(REPO_ROOT, relativeFilePath);
  const oasDoc = yaml.load(fs.readFileSync(absPath, 'utf8'));

  for (const [_pathName, pathValue] of Object.entries(oasDoc.paths ?? {})) {
    const pathName = _pathName.trim();
    log.debug(`Extracting componentized path: ${pathName}`);
    if (
      // traverse pull yaml structure to find all schemas and convert to component refs
      // traverse each API path, recursively look for object schemas, and replace with $ref to components/schemas
      // Each component schema should be named based on the unique path and method it was found in, e.g., GetApiUsersResponse, PostApiOrdersRequest, etc.
      // ensure all leaves of the schema tree are processed, including nested objects and arrays
      // use COMPONENT_PREFIX to identify schemas to be replaced in here somewhere
      false
    ) {
      log.debug(`Skipping path: ${pathName}.`);
      continue;
    }

    // eslint-disable-next-line no-unused-vars
    for (const [method, methodValue] of Object.entries(pathValue)) {
      // do stuff
      log.debug(`  Processing method: ${method.toUpperCase()}`);
      // recursively traverse methodValue to find schemas
    }
  }

  log.info(`Writing file with componentized schemas to ${absPath}`);
  fs.writeFileSync(absPath, yaml.dump(oasDoc, { noRefs: true, lineWidth: -1 }), 'utf8');
};

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

module.exports = { componentizeObjectSchemas };

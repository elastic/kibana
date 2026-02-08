/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
require('@kbn/setup-node-env');
const { run } = require('@kbn/dev-cli-runner');
const { resolveExternalReferences } = require('../lib/resolve_external_refs');

if (require.main === module) {
  run(
    async ({ log, flagsReader }) => {
      try {
        const [relativeFilePath] = flagsReader.getPositionals();
        if (!relativeFilePath) {
          log.error('Please provide a file path');
          process.exit(1);
        }
        await resolveExternalReferences(relativeFilePath, { log });
      } catch (error) {
        log.error(`Error: ${error.message}`);
        log.error(error.stack);
        process.exit(1);
      }
    },
    {
      description: 'Resolve external file references to component references in a given OAS file.',
      usage: 'node scripts/resolve_external_refs.js <path-to-kbn-oas-file>',
    }
  ).catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { resolveExternalRefs: resolveExternalReferences };

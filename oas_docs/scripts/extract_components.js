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
const { componentizeObjectSchemas } = require('../lib/componentize');
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

module.exports = { extractComponents: componentizeObjectSchemas };

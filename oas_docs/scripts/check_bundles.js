/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
const { existsSync } = require('fs');

/**
 * @param {string} filePath
 * @returns {void}
 */
module.exports = (filePath) => {
  if (!existsSync(filePath)) {
    throw new Error(
      `${filePath} not found, use "node scripts/capture_oas_snapshot --include-path <your-api-path> --update" to generate it before running this script.`
    );
  }
};

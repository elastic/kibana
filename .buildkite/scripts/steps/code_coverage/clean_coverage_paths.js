/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { readFileSync, writeFileSync } = require('fs');

const FILE = process.argv[2];
const replacementAnchor = 'CC_REPLACEMENT_ANCHOR';
writeFileSync(
  FILE,
  readFileSync(FILE).toString().replaceAll(process.env.KIBANA_DIR, replacementAnchor)
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const resultsDir = path.resolve('./results');

const files = await fs.readdir(resultsDir);
const reviewFiles = files.filter((file) => file.endsWith('_review.json'));

const rulesDict = {};

for (const file of reviewFiles) {
  const filePath = path.join(resultsDir, file);
  const data = await fs.readFile(filePath, 'utf8');
  const jsonData = JSON.parse(data);

  for (const rule of jsonData.rules) {
    if (!rule.diff.fields.version.has_base_version) {
      rulesDict[`${rule.rule_id}_${rule.current_rule.version}.json`] = file.split('_')[0];
    }
  }
}

console.log(
  Object.entries(rulesDict)
    .map(([rule, file]) => `${rule} from package ${file}`)
    .join('\n')
);

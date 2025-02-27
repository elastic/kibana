/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeFileSync } from 'fs';

const encoding = 'utf8';
const appendUtf8 = { flag: 'a', encoding };

export const flush = (dest) => (assignments) => {
  const writeToFile = writeFileSync.bind(null, dest);

  writeToFile('', { encoding });

  for (const xs of assignments) xs.forEach((x) => writeToFile(`${x}\n`, appendUtf8));
};

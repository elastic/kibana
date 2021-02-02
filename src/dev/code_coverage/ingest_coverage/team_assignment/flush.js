/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { writeFileSync } from 'fs';
import shell from 'shelljs';
import { tryCatch } from '../either';
import { id } from '../utils';

const encoding = 'utf8';
const appendUtf8 = { flag: 'a', encoding };

export const flush = (dest) => (log) => (assignments) => {
  log.verbose(`\n### Flushing assignments to: \n\t${dest}`);

  const writeToFile = writeFileSync.bind(null, dest);

  writeToFile('', { encoding });

  for (const xs of assignments) xs.forEach((x) => writeToFile(`${x}\n`, appendUtf8));

  tryCatch(() => maybeShowSize(dest)).fold(id, (x) => {
    log.verbose(`\n### Flushed [${x}] lines`);
  });
};
function maybeShowSize(x) {
  const { output } = shell.exec(`wc -l ${x}`, { silent: true });
  return output.match(/\s*\d*\s*/)[0].trim();
}

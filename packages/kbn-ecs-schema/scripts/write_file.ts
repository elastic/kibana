/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'path';
import fs from 'fs';

export function write(filePath: string, content: string) {
  try {
    fs.writeFileSync(path.resolve(__dirname, filePath), content);
  } catch (e) {
    console.error(`Failed to write to file at ${filePath}`);
    console.error(e);
    process.exit(1);
  }
}

export function append(filePath: string, content: string) {
  try {
    fs.appendFileSync(path.resolve(__dirname, filePath), content);
  } catch (e) {
    console.error(`Failed to append to file at ${filePath}`);
    console.error(e);
    process.exit(1);
  }
}

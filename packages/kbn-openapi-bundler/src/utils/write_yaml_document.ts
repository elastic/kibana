/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs/promises';
import { dump } from 'js-yaml';
import { dirname } from 'path';

export async function writeYamlDocument(filePath: string, document: unknown): Promise<void> {
  try {
    const yaml = dump(document, { noRefs: true });

    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, yaml);
  } catch (e) {
    throw new Error(`Unable to write bundled yaml: ${e.message}`, { cause: e });
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs/promises';
import { load } from 'js-yaml';
import { OpenAPIV3 } from 'openapi-types';

export async function readYamlDocument(filePath: string): Promise<OpenAPIV3.Document> {
  // Typing load's result to OpenAPIV3.Document is optimistic as we can't be sure
  // there is an OpenAPI spec inside a yaml file. We don't have this validation layer so far
  // but using JSON Schemas here should mitigate this problem.
  return load(await fs.readFile(filePath, { encoding: 'utf8' }));
}

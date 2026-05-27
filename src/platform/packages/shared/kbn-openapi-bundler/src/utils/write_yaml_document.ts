/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import { dump } from 'js-yaml';
import { dirname } from 'path';

export async function writeYamlDocument(filePath: string, document: unknown): Promise<void> {
  try {
    const yaml = stringifyToYaml(document);

    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, yaml);
  } catch (e) {
    throw new Error(`Unable to write bundled yaml: ${e.message}`, { cause: e });
  }
}

function stringifyToYaml(document: unknown): string {
  try {
    // Disable YAML Anchors https://yaml.org/spec/1.2.2/#3222-anchors-and-aliases
    // It makes YAML much more human readable
    return dump(document, {
      noRefs: true,
      sortKeys: sortYamlKeys,
      skipInvalid: true, // Skip invalid types like `undefined`
    });
  } catch (e) {
    // Try to stringify with YAML Anchors enabled
    return dump(document, { noRefs: false, sortKeys: sortYamlKeys, skipInvalid: true });
  }
}

function sortYamlKeys(a: string, b: string): number {
  if (a in FIELDS_ORDER && b in FIELDS_ORDER) {
    return FIELDS_ORDER[a as CustomOrderedField] - FIELDS_ORDER[b as CustomOrderedField];
  }

  return a.localeCompare(b);
}

const FIELDS_ORDER = {
  // root level fields
  openapi: 1,
  info: 2,
  servers: 3,
  paths: 4,
  components: 5,
  security: 6,
  tags: 7,
  externalDocs: 8,
  // object schema fields
  type: 9,
  properties: 10,
  required: 11,
} as const;

type CustomOrderedField = keyof typeof FIELDS_ORDER;

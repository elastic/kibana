/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs/promises';
import { Document, isScalar } from 'yaml';
import type { Pair } from 'yaml';
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
    const doc = new Document(document, {
      aliasDuplicateObjects: false,
      sortMapEntries: sortYamlKeys,
      strict: false,
    });
    return doc.toString();
  } catch (e) {
    // Try to stringify with YAML Anchors enabled
    const doc = new Document(document, {
      aliasDuplicateObjects: true,
      sortMapEntries: sortYamlKeys,
      strict: false,
    });
    return doc.toString();
  }
}

function sortYamlKeys(a: Pair, b: Pair): number {
  if (!isScalar(a.key) || !isScalar(b.key)) {
    return 0;
  }
  const keyA = a.key.value;
  const keyB = b.key.value;
  if (typeof keyA !== 'string' || typeof keyB !== 'string') {
    return 0;
  }
  if (keyA in FIELDS_ORDER && keyB in FIELDS_ORDER) {
    return FIELDS_ORDER[keyA as CustomOrderedField] - FIELDS_ORDER[keyB as CustomOrderedField];
  }

  return keyA.localeCompare(keyB);
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

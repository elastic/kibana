/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Loads definitions from JSON files in the specified directory.
 * Returns a Map where the key is the definition name and the value is the parsed definition.
 */
export function loadElasticDefinitions<T>(definitionsPath: string): Map<string, T> {
  const definitionEntries = fs
    .readdirSync(definitionsPath)
    .filter((file) => path.extname(file) === '.json')
    .map((file): [string, T] => {
      const definition = JSON.parse(fs.readFileSync(path.join(definitionsPath, file), 'utf-8'));
      return [definition.name, definition];
    });

  return new Map(definitionEntries);
}

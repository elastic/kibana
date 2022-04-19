/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Fs from 'fs';

/**
 * Simple parsed representation of a package.json file, validated
 * by `assertParsedPackageJson()` and extensible as needed in the future
 */
export interface ParsedPackageJson {
  /**
   * The name of the package, usually `@kbn/`+something
   */
  name: string;
  /** "dependenices" property from package.json */
  dependencies?: Record<string, string>;
  /** "devDependenices" property from package.json */
  devDependencies?: Record<string, string>;
  /**
   * All other fields in the package.json are typed as unknown as we don't care what they are
   */
  [key: string]: unknown;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return !!(typeof v === 'object' && v);
}

/**
 * Asserts that given value looks like a parsed package.json file
 */
export function assertParsedPackageJson(v: unknown): asserts v is ParsedPackageJson {
  if (!isObj(v) || typeof v.name !== 'string') {
    throw new Error('Expected at least a "name" property');
  }

  if (v.dependencies && !isObj(v.dependencies)) {
    throw new Error('Expected "dependencies" to be an object');
  }

  if (v.devDependencies && !isObj(v.devDependencies)) {
    throw new Error('Expected "dependencies" to be an object');
  }
}

/**
 * Reads a given package.json file from disk and parses it
 */
export function readPackageJson(path: string): ParsedPackageJson {
  let pkg;
  try {
    pkg = JSON.parse(Fs.readFileSync(path, 'utf8'));
    assertParsedPackageJson(pkg);
  } catch (error) {
    throw new Error(`unable to parse package.json at [${path}]: ${error.message}`);
  }
  return pkg;
}

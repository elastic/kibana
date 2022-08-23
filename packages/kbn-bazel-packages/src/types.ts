/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Simple parsed representation of a package.json file, validated
 * by `assertParsedPackageJson()` and extensible as needed in the future
 */
export interface ParsedPackageJson {
  /** The name of the package, usually `@kbn/`+something */
  name: string;
  /** "dependenices" property from package.json */
  dependencies?: Record<string, string>;
  /** "devDependenices" property from package.json */
  devDependencies?: Record<string, string>;
  /** Some kibana specific properties about this package */
  kibana?: {
    /** Is this package only intended for dev? */
    devOnly?: boolean;
  };
  /** Scripts defined in the package.json file */
  scripts?: {
    [key: string]: string | undefined;
  };
  /** All other fields in the package.json are typed as unknown as we don't care what they are */
  [key: string]: unknown;
}

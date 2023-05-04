/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * These fields contain Mac OS Mach Object file format (Mach-O) metadata.
 */
export interface EcsMacho {
  /**
   * A hash of the Go language imports in a Mach-O file excluding standard library imports. An import hash can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.
   * The algorithm used to calculate the Go symbol hash and a reference implementation are available [here](https://github.com/elastic/toutoumomoma).
   */
  go_import_hash?: string;
  /**
   * List of imported Go language element names and types.
   */
  go_imports?: Record<string, unknown>;
  /**
   * Shannon entropy calculation from the list of Go imports.
   */
  go_imports_names_entropy?: number;
  /**
   * Variance for Shannon entropy calculation from the list of Go imports.
   */
  go_imports_names_var_entropy?: number;
  /**
   * Set to true if the file is a Go executable that has had its symbols stripped or obfuscated and false if an unobfuscated Go executable.
   */
  go_stripped?: boolean;
  /**
   * A hash of the imports in a Mach-O file. An import hash can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.
   * This is a synonym for symhash.
   */
  import_hash?: string;
  /**
   * List of imported element names and types.
   */
  imports?: Record<string, unknown>;
  /**
   * Shannon entropy calculation from the list of imported element names and types.
   */
  imports_names_entropy?: number;
  /**
   * Variance for Shannon entropy calculation from the list of imported element names and types.
   */
  imports_names_var_entropy?: number;
  /**
   * An array containing an object for each section of the Mach-O file.
   * The keys that should be present in these objects are defined by sub-fields underneath `macho.sections.*`.
   */
  sections?: Record<string, unknown>;
  /**
   * A hash of the imports in a Mach-O file. An import hash can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.
   * This is a Mach-O implementation of the Windows PE imphash
   */
  symhash?: string;
}

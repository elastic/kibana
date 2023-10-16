/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * These fields contain Windows Portable Executable (PE) metadata.
 */
export interface EcsPe {
  /**
   * CPU architecture target for the file.
   */
  architecture?: string;
  /**
   * Internal company name of the file, provided at compile-time.
   */
  company?: string;
  /**
   * Internal description of the file, provided at compile-time.
   */
  description?: string;
  /**
   * Internal version of the file, provided at compile-time.
   */
  file_version?: string;
  /**
   * A hash of the imports in a PE file. An imphash -- or import hash -- can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.
   * Learn more at https://www.fireeye.com/blog/threat-research/2014/01/tracking-malware-import-hashing.html.
   */
  imphash?: string;
  /**
   * Internal name of the file, provided at compile-time.
   */
  original_file_name?: string;
  /**
   * A hash of the PE header and data from one or more PE sections. An pehash can be used to cluster files by transforming structural information about a file into a hash value.
   * Learn more at https://www.usenix.org/legacy/events/leet09/tech/full_papers/wicherski/wicherski_html/index.html.
   */
  pehash?: string;
  /**
   * Internal product name of the file, provided at compile-time.
   */
  product?: string;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * These fields contain information about code libraries dynamically loaded into processes.
 *
 * Many operating systems refer to "shared code libraries" with different names, but this field set refers to all of the following:
 * * Dynamic-link library (`.dll`) commonly used on Windows
 * * Shared Object (`.so`) commonly used on Unix-like operating systems
 * * Dynamic library (`.dylib`) commonly used on macOS
 */
export interface EcsDll {
  code_signature?: {
    /**
     * The hashing algorithm used to sign the process.
     * This value can distinguish signatures when a file is signed multiple times by the same signer but with a different digest algorithm.
     */
    digest_algorithm?: string;
    /**
     * Boolean to capture if a signature is present.
     */
    exists?: boolean;
    /**
     * The identifier used to sign the process.
     * This is used to identify the application manufactured by a software vendor. The field is relevant to Apple *OS only.
     */
    signing_id?: string;
    /**
     * Additional information about the certificate status.
     * This is useful for logging cryptographic errors with the certificate validity or trust status. Leave unpopulated if the validity or trust of the certificate was unchecked.
     */
    status?: string;
    /**
     * Subject name of the code signer
     */
    subject_name?: string;
    /**
     * The team identifier used to sign the process.
     * This is used to identify the team or vendor of a software product. The field is relevant to Apple *OS only.
     */
    team_id?: string;
    /**
     * Date and time when the code signature was generated and signed.
     */
    timestamp?: string;
    /**
     * Stores the trust status of the certificate chain.
     * Validating the trust of the certificate chain may be complicated, and this field should only be populated by tools that actively check the status.
     */
    trusted?: boolean;
    /**
     * Boolean to capture if the digital signature is verified against the binary content.
     * Leave unpopulated if a certificate was unchecked.
     */
    valid?: boolean;
  };

  hash?: {
    /**
     * MD5 hash.
     */
    md5?: string;
    /**
     * SHA1 hash.
     */
    sha1?: string;
    /**
     * SHA256 hash.
     */
    sha256?: string;
    /**
     * SHA384 hash.
     */
    sha384?: string;
    /**
     * SHA512 hash.
     */
    sha512?: string;
    /**
     * SSDEEP hash.
     */
    ssdeep?: string;
    /**
     * TLSH hash.
     */
    tlsh?: string;
  };

  /**
   * Name of the library.
   * This generally maps to the name of the file on disk.
   */
  name?: string;
  /**
   * Full file path of the library.
   */
  path?: string;
  pe?: {
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
     * A hash of the Go language imports in a PE file excluding standard library imports. An import hash can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.
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
     * A hash of the imports in a PE file. An imphash -- or import hash -- can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.
     * Learn more at https://www.fireeye.com/blog/threat-research/2014/01/tracking-malware-import-hashing.html.
     */
    imphash?: string;
    /**
     * A hash of the imports in a PE file. An import hash can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.
     * This is a synonym for imphash.
     */
    import_hash?: string;
    /**
     * List of imported element names and types.
     */
    imports?: Record<string, unknown> | Array<Record<string, unknown>>;
    /**
     * Shannon entropy calculation from the list of imported element names and types.
     */
    imports_names_entropy?: number;
    /**
     * Variance for Shannon entropy calculation from the list of imported element names and types.
     */
    imports_names_var_entropy?: number;
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
    /**
     * An array containing an object for each section of the PE file.
     * The keys that should be present in these objects are defined by sub-fields underneath `pe.sections.*`.
     */
    sections?: Record<string, unknown> | Array<Record<string, unknown>>;
  };
}

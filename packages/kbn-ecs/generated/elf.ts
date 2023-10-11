/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * These fields contain Linux Executable Linkable Format (ELF) metadata.
 */
export interface EcsElf {
  /**
   * Machine architecture of the ELF file.
   */
  architecture?: string;
  /**
   * Byte sequence of ELF file.
   */
  byte_order?: string;
  /**
   * CPU type of the ELF file.
   */
  cpu_type?: string;
  /**
   * Extracted when possible from the file's metadata. Indicates when it was built or compiled. It can also be faked by malware creators.
   */
  creation_date?: string;
  /**
   * List of exported element names and types.
   */
  exports?: Record<string, unknown> | Array<Record<string, unknown>>;
  /**
   * A hash of the Go language imports in an ELF file excluding standard library imports. An import hash can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.
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
  header?: {
    /**
     * Version of the ELF Application Binary Interface (ABI).
     */
    abi_version?: string;
    /**
     * Header class of the ELF file.
     */
    class?: string;
    /**
     * Data table of the ELF header.
     */
    data?: string;
    /**
     * Header entrypoint of the ELF file.
     */
    entrypoint?: number;
    /**
     * "0x1" for original ELF files.
     */
    object_version?: string;
    /**
     * Application Binary Interface (ABI) of the Linux OS.
     */
    os_abi?: string;
    /**
     * Header type of the ELF file.
     */
    type?: string;
    /**
     * Version of the ELF header.
     */
    version?: string;
  };

  /**
   * A hash of the imports in an ELF file. An import hash can be used to fingerprint binaries even after recompilation or other code-level transformations have occurred, which would change more traditional hash values.
   * This is an ELF implementation of the Windows PE imphash.
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
   * An array containing an object for each section of the ELF file.
   * The keys that should be present in these objects are defined by sub-fields underneath `elf.sections.*`.
   */
  sections?: Record<string, unknown> | Array<Record<string, unknown>>;
  /**
   * An array containing an object for each segment of the ELF file.
   * The keys that should be present in these objects are defined by sub-fields underneath `elf.segments.*`.
   */
  segments?: Record<string, unknown> | Array<Record<string, unknown>>;
  /**
   * List of shared libraries used by this ELF object.
   */
  shared_libraries?: string | string[];
  /**
   * telfhash symbol hash for ELF file.
   */
  telfhash?: string;
}

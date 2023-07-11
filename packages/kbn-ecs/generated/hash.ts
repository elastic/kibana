/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * The hash fields represent different bitwise hash algorithms and their values.
 * Field names for common hashes (e.g. MD5, SHA1) are predefined. Add fields for other hashes by lowercasing the hash algorithm name and using underscore separators as appropriate (snake case, e.g. sha3_512).
 * Note that this fieldset is used for common hashes that may be computed over a range of generic bytes. Entity-specific hashes such as ja3 or imphash are placed in the fieldsets to which they relate (tls and pe, respectively).
 */
export interface EcsHash {
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
}

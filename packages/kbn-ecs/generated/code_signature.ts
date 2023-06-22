/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * These fields contain information about binary code signatures.
 */
export interface EcsCodeSignature {
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
}

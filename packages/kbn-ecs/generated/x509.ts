/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This implements the common core fields for x509 certificates. This information is likely logged with TLS sessions, digital signatures found in executable binaries, S/MIME information in email bodies, or analysis of files on disk.
 * When the certificate relates to a file, use the fields at `file.x509`. When hashes of the DER-encoded certificate are available, the `hash` data set should be populated as well (e.g. `file.hash.sha256`).
 * Events that contain certificate information about network connections, should use the x509 fields under the relevant TLS fields: `tls.server.x509` and/or `tls.client.x509`.
 */
export interface EcsX509 {
  /**
   * List of subject alternative names (SAN). Name types vary by certificate authority and certificate type but commonly contain IP addresses, DNS names (and wildcards), and email addresses.
   */
  alternative_names?: string[];
  issuer?: {
    /**
     * List of common name (CN) of issuing certificate authority.
     */
    common_name?: string[];
    /**
     * List of country \(C) codes
     */
    country?: string[];
    /**
     * Distinguished name (DN) of issuing certificate authority.
     */
    distinguished_name?: string;
    /**
     * List of locality names (L)
     */
    locality?: string[];
    /**
     * List of organizations (O) of issuing certificate authority.
     */
    organization?: string[];
    /**
     * List of organizational units (OU) of issuing certificate authority.
     */
    organizational_unit?: string[];
    /**
     * List of state or province names (ST, S, or P)
     */
    state_or_province?: string[];
  };

  /**
   * Time at which the certificate is no longer considered valid.
   */
  not_after?: string;
  /**
   * Time at which the certificate is first considered valid.
   */
  not_before?: string;
  /**
   * Algorithm used to generate the public key.
   */
  public_key_algorithm?: string;
  /**
   * The curve used by the elliptic curve public key algorithm. This is algorithm specific.
   */
  public_key_curve?: string;
  /**
   * Exponent used to derive the public key. This is algorithm specific.
   */
  public_key_exponent?: number;
  /**
   * The size of the public key space in bits.
   */
  public_key_size?: number;
  /**
   * Unique serial number issued by the certificate authority. For consistency, if this value is alphanumeric, it should be formatted without colons and uppercase characters.
   */
  serial_number?: string;
  /**
   * Identifier for certificate signature algorithm. We recommend using names found in Go Lang Crypto library. See https://github.com/golang/go/blob/go1.14/src/crypto/x509/x509.go#L337-L353.
   */
  signature_algorithm?: string;
  subject?: {
    /**
     * List of common names (CN) of subject.
     */
    common_name?: string[];
    /**
     * List of country \(C) code
     */
    country?: string[];
    /**
     * Distinguished name (DN) of the certificate subject entity.
     */
    distinguished_name?: string;
    /**
     * List of locality names (L)
     */
    locality?: string[];
    /**
     * List of organizations (O) of subject.
     */
    organization?: string[];
    /**
     * List of organizational units (OU) of subject.
     */
    organizational_unit?: string[];
    /**
     * List of state or province names (ST, S, or P)
     */
    state_or_province?: string[];
  };

  /**
   * Version of x509 format.
   */
  version_number?: string;
}

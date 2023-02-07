/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Fields related to a TLS connection. These fields focus on the TLS protocol itself and intentionally avoids in-depth analysis of the related x.509 certificate files.
 */
export interface EcsTls {
  /**
   * String indicating the cipher used during the current connection.
   */
  cipher?: string;
  client?: {
    /**
     * PEM-encoded stand-alone certificate offered by the client. This is usually mutually-exclusive of `client.certificate_chain` since this value also exists in that list.
     */
    certificate?: string;
    /**
     * Array of PEM-encoded certificates that make up the certificate chain offered by the client. This is usually mutually-exclusive of `client.certificate` since that value should be the first certificate in the chain.
     */
    certificate_chain?: string[];
    hash?: {
      /**
       * Certificate fingerprint using the MD5 digest of DER-encoded version of certificate offered by the client. For consistency with other hash values, this value should be formatted as an uppercase hash.
       */
      md5?: string;
      /**
       * Certificate fingerprint using the SHA1 digest of DER-encoded version of certificate offered by the client. For consistency with other hash values, this value should be formatted as an uppercase hash.
       */
      sha1?: string;
      /**
       * Certificate fingerprint using the SHA256 digest of DER-encoded version of certificate offered by the client. For consistency with other hash values, this value should be formatted as an uppercase hash.
       */
      sha256?: string;
    };

    /**
     * Distinguished name of subject of the issuer of the x.509 certificate presented by the client.
     */
    issuer?: string;
    /**
     * A hash that identifies clients based on how they perform an SSL/TLS handshake.
     */
    ja3?: string;
    /**
     * Date/Time indicating when client certificate is no longer considered valid.
     */
    not_after?: string;
    /**
     * Date/Time indicating when client certificate is first considered valid.
     */
    not_before?: string;
    /**
     * Also called an SNI, this tells the server which hostname to which the client is attempting to connect to. When this value is available, it should get copied to `destination.domain`.
     */
    server_name?: string;
    /**
     * Distinguished name of subject of the x.509 certificate presented by the client.
     */
    subject?: string;
    /**
     * Array of ciphers offered by the client during the client hello.
     */
    supported_ciphers?: string[];
    x509?: {
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
    };
  };

  /**
   * String indicating the curve used for the given cipher, when applicable.
   */
  curve?: string;
  /**
   * Boolean flag indicating if the TLS negotiation was successful and transitioned to an encrypted tunnel.
   */
  established?: boolean;
  /**
   * String indicating the protocol being tunneled. Per the values in the IANA registry (https://www.iana.org/assignments/tls-extensiontype-values/tls-extensiontype-values.xhtml#alpn-protocol-ids), this string should be lower case.
   */
  next_protocol?: string;
  /**
   * Boolean flag indicating if this TLS connection was resumed from an existing TLS negotiation.
   */
  resumed?: boolean;
  server?: {
    /**
     * PEM-encoded stand-alone certificate offered by the server. This is usually mutually-exclusive of `server.certificate_chain` since this value also exists in that list.
     */
    certificate?: string;
    /**
     * Array of PEM-encoded certificates that make up the certificate chain offered by the server. This is usually mutually-exclusive of `server.certificate` since that value should be the first certificate in the chain.
     */
    certificate_chain?: string[];
    hash?: {
      /**
       * Certificate fingerprint using the MD5 digest of DER-encoded version of certificate offered by the server. For consistency with other hash values, this value should be formatted as an uppercase hash.
       */
      md5?: string;
      /**
       * Certificate fingerprint using the SHA1 digest of DER-encoded version of certificate offered by the server. For consistency with other hash values, this value should be formatted as an uppercase hash.
       */
      sha1?: string;
      /**
       * Certificate fingerprint using the SHA256 digest of DER-encoded version of certificate offered by the server. For consistency with other hash values, this value should be formatted as an uppercase hash.
       */
      sha256?: string;
    };

    /**
     * Subject of the issuer of the x.509 certificate presented by the server.
     */
    issuer?: string;
    /**
     * A hash that identifies servers based on how they perform an SSL/TLS handshake.
     */
    ja3s?: string;
    /**
     * Timestamp indicating when server certificate is no longer considered valid.
     */
    not_after?: string;
    /**
     * Timestamp indicating when server certificate is first considered valid.
     */
    not_before?: string;
    /**
     * Subject of the x.509 certificate presented by the server.
     */
    subject?: string;
    x509?: {
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
    };
  };

  /**
   * Numeric part of the version parsed from the original string.
   */
  version?: string;
  /**
   * Normalized lowercase protocol name parsed from original string.
   */
  version_protocol?: string;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Fields to classify events and alerts according to a threat taxonomy such as the MITRE ATT&CK® framework.
 * These fields are for users to classify alerts from all of their sources (e.g. IDS, NGFW, etc.) within a common taxonomy. The threat.tactic.* fields are meant to capture the high level category of the threat (e.g. "impact"). The threat.technique.* fields are meant to capture which kind of approach is used by this detected threat, to accomplish the goal (e.g. "endpoint denial of service").
 */
export interface EcsThreat {
  /**
   * A list of associated indicators objects enriching the event, and the context of that association/enrichment.
   */
  enrichments?: Array<Record<string, unknown>>;
  feed?: {
    /**
     * The saved object ID of the dashboard belonging to the threat feed for displaying dashboard links to threat feeds in Kibana.
     */
    dashboard_id?: string;
    /**
     * Description of the threat feed in a UI friendly format.
     */
    description?: string;
    /**
     * The name of the threat feed in UI friendly format.
     */
    name?: string;
    /**
     * Reference information for the threat feed in a UI friendly format.
     */
    reference?: string;
  };

  /**
   * Name of the threat framework used to further categorize and classify the tactic and technique of the reported threat. Framework classification can be provided by detecting systems, evaluated at ingest time, or retrospectively tagged to events.
   */
  framework?: string;
  group?: {
    /**
     * The alias(es) of the group for a set of related intrusion activity that are tracked by a common name in the security community.
     * While not required, you can use a MITRE ATT&CK® group alias(es).
     */
    alias?: string[];
    /**
     * The id of the group for a set of related intrusion activity that are tracked by a common name in the security community.
     * While not required, you can use a MITRE ATT&CK® group id.
     */
    id?: string;
    /**
     * The name of the group for a set of related intrusion activity that are tracked by a common name in the security community.
     * While not required, you can use a MITRE ATT&CK® group name.
     */
    name?: string;
    /**
     * The reference URL of the group for a set of related intrusion activity that are tracked by a common name in the security community.
     * While not required, you can use a MITRE ATT&CK® group reference URL.
     */
    reference?: string;
  };

  indicator?: {
    as?: {
      /**
       * Unique number allocated to the autonomous system. The autonomous system number (ASN) uniquely identifies each network on the Internet.
       */
      number?: number;
      organization?: {
        /**
         * Organization name.
         */
        name?: string;
      };
    };

    /**
     * Identifies the vendor-neutral confidence rating using the None/Low/Medium/High scale defined in Appendix A of the STIX 2.1 framework. Vendor-specific confidence scales may be added as custom fields.
     */
    confidence?: string;
    /**
     * Describes the type of action conducted by the threat.
     */
    description?: string;
    email?: {
      /**
       * Identifies a threat indicator as an email address (irrespective of direction).
       */
      address?: string;
    };

    file?: {
      /**
       * Last time the file was accessed.
       * Note that not all filesystems keep track of access time.
       */
      accessed?: string;
      /**
       * Array of file attributes.
       * Attributes names will vary by platform. Here's a non-exhaustive list of values that are expected in this field: archive, compressed, directory, encrypted, execute, hidden, read, readonly, system, write.
       */
      attributes?: string[];
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

      /**
       * File creation time.
       * Note that not all filesystems store the creation time.
       */
      created?: string;
      /**
       * Last time the file attributes or metadata changed.
       * Note that changes to the file content will update `mtime`. This implies `ctime` will be adjusted at the same time, since `mtime` is an attribute of the file.
       */
      ctime?: string;
      /**
       * Device that is the source of the file.
       */
      device?: string;
      /**
       * Directory where the file is located. It should include the drive letter, when appropriate.
       */
      directory?: string;
      /**
       * Drive letter where the file is located. This field is only relevant on Windows.
       * The value should be uppercase, and not include the colon.
       */
      drive_letter?: string;
      elf?: {
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
        exports?: Array<Record<string, unknown>>;
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
         * List of imported element names and types.
         */
        imports?: Array<Record<string, unknown>>;
        /**
         * An array containing an object for each section of the ELF file.
         * The keys that should be present in these objects are defined by sub-fields underneath `elf.sections.*`.
         */
        sections?: Array<Record<string, unknown>>;
        /**
         * An array containing an object for each segment of the ELF file.
         * The keys that should be present in these objects are defined by sub-fields underneath `elf.segments.*`.
         */
        segments?: Array<Record<string, unknown>>;
        /**
         * List of shared libraries used by this ELF object.
         */
        shared_libraries?: string[];
        /**
         * telfhash symbol hash for ELF file.
         */
        telfhash?: string;
      };

      /**
       * File extension, excluding the leading dot.
       * Note that when the file name has multiple extensions (example.tar.gz), only the last one should be captured ("gz", not "tar.gz").
       */
      extension?: string;
      /**
       * A fork is additional data associated with a filesystem object.
       * On Linux, a resource fork is used to store additional data with a filesystem object. A file always has at least one fork for the data portion, and additional forks may exist.
       * On NTFS, this is analogous to an Alternate Data Stream (ADS), and the default data stream for a file is just called $DATA. Zone.Identifier is commonly used by Windows to track contents downloaded from the Internet. An ADS is typically of the form: `C:\path\to\filename.extension:some_fork_name`, and `some_fork_name` is the value that should populate `fork_name`. `filename.extension` should populate `file.name`, and `extension` should populate `file.extension`. The full path, `file.path`, will include the fork name.
       */
      fork_name?: string;
      /**
       * Primary group ID (GID) of the file.
       */
      gid?: string;
      /**
       * Primary group name of the file.
       */
      group?: string;
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
       * Inode representing the file in the filesystem.
       */
      inode?: string;
      /**
       * MIME type should identify the format of the file or stream of bytes using https://www.iana.org/assignments/media-types/media-types.xhtml[IANA official types], where possible. When more than one type is applicable, the most specific type should be used.
       */
      mime_type?: string;
      /**
       * Mode of the file in octal representation.
       */
      mode?: string;
      /**
       * Last time the file content was modified.
       */
      mtime?: string;
      /**
       * Name of the file including the extension, without the directory.
       */
      name?: string;
      /**
       * File owner's username.
       */
      owner?: string;
      /**
       * Full path to the file, including the file name. It should include the drive letter, when appropriate.
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
      };

      /**
       * File size in bytes.
       * Only relevant when `file.type` is "file".
       */
      size?: number;
      /**
       * Target path for symlinks.
       */
      target_path?: string;
      /**
       * File type (file, dir, or symlink).
       */
      type?: string;
      /**
       * The user ID (UID) or security identifier (SID) of the file owner.
       */
      uid?: string;
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
     * The date and time when intelligence source first reported sighting this indicator.
     */
    first_seen?: string;
    geo?: {
      /**
       * City name.
       */
      city_name?: string;
      /**
       * Two-letter code representing continent's name.
       */
      continent_code?: string;
      /**
       * Name of the continent.
       */
      continent_name?: string;
      /**
       * Country ISO code.
       */
      country_iso_code?: string;
      /**
       * Country name.
       */
      country_name?: string;
      /**
       * Longitude and latitude.
       */
      location?: { lat: number; lon: number };
      /**
       * User-defined description of a location, at the level of granularity they care about.
       * Could be the name of their data centers, the floor number, if this describes a local physical entity, city names.
       * Not typically used in automated geolocation.
       */
      name?: string;
      /**
       * Postal code associated with the location.
       * Values appropriate for this field may also be known as a postcode or ZIP code and will vary widely from country to country.
       */
      postal_code?: string;
      /**
       * Region ISO code.
       */
      region_iso_code?: string;
      /**
       * Region name.
       */
      region_name?: string;
      /**
       * The time zone of the location, such as IANA time zone name.
       */
      timezone?: string;
    };

    /**
     * Identifies a threat indicator as an IP address (irrespective of direction).
     */
    ip?: string;
    /**
     * The date and time when intelligence source last reported sighting this indicator.
     */
    last_seen?: string;
    marking?: {
      /**
       * Traffic Light Protocol sharing markings.
       */
      tlp?: string;
    };

    /**
     * The date and time when intelligence source last modified information for this indicator.
     */
    modified_at?: string;
    /**
     * Identifies a threat indicator as a port number (irrespective of direction).
     */
    port?: number;
    /**
     * The name of the indicator's provider.
     */
    provider?: string;
    /**
     * Reference URL linking to additional information about this indicator.
     */
    reference?: string;
    registry?: {
      data?: {
        /**
         * Original bytes written with base64 encoding.
         * For Windows registry operations, such as SetValueEx and RegQueryValueEx, this corresponds to the data pointed by `lp_data`. This is optional but provides better recoverability and should be populated for REG_BINARY encoded values.
         */
        bytes?: string;
        /**
         * Content when writing string types.
         * Populated as an array when writing string data to the registry. For single string registry types (REG_SZ, REG_EXPAND_SZ), this should be an array with one string. For sequences of string with REG_MULTI_SZ, this array will be variable length. For numeric data, such as REG_DWORD and REG_QWORD, this should be populated with the decimal representation (e.g `"1"`).
         */
        strings?: string[];
        /**
         * Standard registry type for encoding contents
         */
        type?: string;
      };

      /**
       * Abbreviated name for the hive.
       */
      hive?: string;
      /**
       * Hive-relative path of keys.
       */
      key?: string;
      /**
       * Full path, including hive, key and value
       */
      path?: string;
      /**
       * Name of the value written.
       */
      value?: string;
    };

    /**
     * Count of AV/EDR vendors that successfully detected malicious file or URL.
     */
    scanner_stats?: number;
    /**
     * Number of times this indicator was observed conducting threat activity.
     */
    sightings?: number;
    /**
     * Type of indicator as represented by Cyber Observable in STIX 2.0.
     */
    type?: string;
    url?: {
      /**
       * Domain of the url, such as "www.elastic.co".
       * In some cases a URL may refer to an IP and/or port directly, without a domain name. In this case, the IP address would go to the `domain` field.
       * If the URL contains a literal IPv6 address enclosed by `[` and `]` (IETF RFC 2732), the `[` and `]` characters should also be captured in the `domain` field.
       */
      domain?: string;
      /**
       * The field contains the file extension from the original request url, excluding the leading dot.
       * The file extension is only set if it exists, as not every url has a file extension.
       * The leading period must not be included. For example, the value must be "png", not ".png".
       * Note that when the file name has multiple extensions (example.tar.gz), only the last one should be captured ("gz", not "tar.gz").
       */
      extension?: string;
      /**
       * Portion of the url after the `#`, such as "top".
       * The `#` is not part of the fragment.
       */
      fragment?: string;
      /**
       * If full URLs are important to your use case, they should be stored in `url.full`, whether this field is reconstructed or present in the event source.
       */
      full?: string;
      /**
       * Unmodified original url as seen in the event source.
       * Note that in network monitoring, the observed URL may be a full URL, whereas in access logs, the URL is often just represented as a path.
       * This field is meant to represent the URL as it was observed, complete or not.
       */
      original?: string;
      /**
       * Password of the request.
       */
      password?: string;
      /**
       * Path of the request, such as "/search".
       */
      path?: string;
      /**
       * Port of the request, such as 443.
       */
      port?: number;
      /**
       * The query field describes the query string of the request, such as "q=elasticsearch".
       * The `?` is excluded from the query string. If a URL contains no `?`, there is no query field. If there is a `?` but no query, the query field exists with an empty string. The `exists` query can be used to differentiate between the two cases.
       */
      query?: string;
      /**
       * The highest registered url domain, stripped of the subdomain.
       * For example, the registered domain for "foo.example.com" is "example.com".
       * This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last two labels will not work well for TLDs such as "co.uk".
       */
      registered_domain?: string;
      /**
       * Scheme of the request, such as "https".
       * Note: The `:` is not part of the scheme.
       */
      scheme?: string;
      /**
       * The subdomain portion of a fully qualified domain name includes all of the names except the host name under the registered_domain.  In a partially qualified domain, or if the the qualification level of the full name cannot be determined, subdomain contains all of the names below the registered domain.
       * For example the subdomain portion of "www.east.mydomain.co.uk" is "east". If the domain has multiple levels of subdomain, such as "sub2.sub1.example.com", the subdomain field should contain "sub2.sub1", with no trailing period.
       */
      subdomain?: string;
      /**
       * The effective top level domain (eTLD), also known as the domain suffix, is the last part of the domain name. For example, the top level domain for example.com is "com".
       * This value can be determined precisely with a list like the public suffix list (http://publicsuffix.org). Trying to approximate this by simply taking the last label will not work well for effective TLDs such as "co.uk".
       */
      top_level_domain?: string;
      /**
       * Username of the request.
       */
      username?: string;
    };

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

  software?: {
    /**
     * The alias(es) of the software for a set of related intrusion activity that are tracked by a common name in the security community.
     * While not required, you can use a MITRE ATT&CK® associated software description.
     */
    alias?: string[];
    /**
     * The id of the software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.
     * While not required, you can use a MITRE ATT&CK® software id.
     */
    id?: string;
    /**
     * The name of the software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.
     * While not required, you can use a MITRE ATT&CK® software name.
     */
    name?: string;
    /**
     * The platforms of the software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.
     * While not required, you can use MITRE ATT&CK® software platform values.
     */
    platforms?: string[];
    /**
     * The reference URL of the software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.
     * While not required, you can use a MITRE ATT&CK® software reference URL.
     */
    reference?: string;
    /**
     * The type of software used by this threat to conduct behavior commonly modeled using MITRE ATT&CK®.
     * While not required, you can use a MITRE ATT&CK® software type.
     */
    type?: string;
  };

  tactic?: {
    /**
     * The id of tactic used by this threat. You can use a MITRE ATT&CK® tactic, for example. (ex. https://attack.mitre.org/tactics/TA0002/ )
     */
    id?: string[];
    /**
     * Name of the type of tactic used by this threat. You can use a MITRE ATT&CK® tactic, for example. (ex. https://attack.mitre.org/tactics/TA0002/)
     */
    name?: string[];
    /**
     * The reference url of tactic used by this threat. You can use a MITRE ATT&CK® tactic, for example. (ex. https://attack.mitre.org/tactics/TA0002/ )
     */
    reference?: string[];
  };

  technique?: {
    /**
     * The id of technique used by this threat. You can use a MITRE ATT&CK® technique, for example. (ex. https://attack.mitre.org/techniques/T1059/)
     */
    id?: string[];
    /**
     * The name of technique used by this threat. You can use a MITRE ATT&CK® technique, for example. (ex. https://attack.mitre.org/techniques/T1059/)
     */
    name?: string[];
    /**
     * The reference url of technique used by this threat. You can use a MITRE ATT&CK® technique, for example. (ex. https://attack.mitre.org/techniques/T1059/)
     */
    reference?: string[];
    subtechnique?: {
      /**
       * The full id of subtechnique used by this threat. You can use a MITRE ATT&CK® subtechnique, for example. (ex. https://attack.mitre.org/techniques/T1059/001/)
       */
      id?: string[];
      /**
       * The name of subtechnique used by this threat. You can use a MITRE ATT&CK® subtechnique, for example. (ex. https://attack.mitre.org/techniques/T1059/001/)
       */
      name?: string[];
      /**
       * The reference url of subtechnique used by this threat. You can use a MITRE ATT&CK® subtechnique, for example. (ex. https://attack.mitre.org/techniques/T1059/001/)
       */
      reference?: string[];
    };
  };

  threat?: {
    indicator?: {
      marking?: {
        tlp?: {
          /**
           * Traffic Light Protocol version.
           */
          version?: string;
        };
      };
    };
  };
}

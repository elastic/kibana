/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A file is defined as a set of information that has been created on, or has existed on a filesystem.
 * File objects can be associated with host events, network events, and/or file events (e.g., those produced by File Integrity Monitoring [FIM] products or services). File fields provide details about the affected file associated with the event or metric.
 */
export interface EcsFile {
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
    exports?: Record<string, unknown>[];
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
    imports?: Record<string, unknown>[];
    /**
     * An array containing an object for each section of the ELF file.
     * The keys that should be present in these objects are defined by sub-fields underneath `elf.sections.*`.
     */
    sections?: Record<string, unknown>[];
    /**
     * An array containing an object for each segment of the ELF file.
     * The keys that should be present in these objects are defined by sub-fields underneath `elf.segments.*`.
     */
    segments?: Record<string, unknown>[];
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
}

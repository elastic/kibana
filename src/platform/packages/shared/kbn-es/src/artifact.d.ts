/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
type ChecksumType = 'sha512';
export type ArtifactLicense = 'basic' | 'trial';
export interface ArtifactSpec {
  url: string;
  checksumUrl: string;
  checksumType: ChecksumType;
  filename: string;
}
export declare class Artifact {
  private readonly log;
  readonly spec: ArtifactSpec;
  /**
   * Fetch an Artifact from the Artifact API for a license level and version
   */
  static getSnapshot(license: ArtifactLicense, version: string, log: ToolingLog): Promise<Artifact>;
  /**
   * Fetch an Artifact from the Elasticsearch past releases url
   */
  static getArchive(url: string, log: ToolingLog): Promise<Artifact>;
  constructor(log: ToolingLog, spec: ArtifactSpec);
  /**
   * Download the artifact to disk, skips the download if the cache is
   * up-to-date, verifies checksum when downloaded
   */
  download(
    dest: string,
    {
      useCached,
    }?: {
      useCached?: boolean;
    }
  ): Promise<void>;
  /**
   * Download (bypassing etag cache) and verify checksum, cleaning up on failure
   */
  private downloadAndVerify;
  private safeUnlink;
  /**
   * Fetch the artifact with an etag
   */
  private fetchArtifact;
  /**
   * Verify the checksum of the downloaded artifact with the checksum at checksumUrl
   */
  private verifyChecksum;
  private fetchExpectedChecksum;
  private verifyExistingFileChecksum;
}
export {};

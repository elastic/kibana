/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Data stored with a file share object
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type FileShare = {
  /**
   * ISO timestamp of when the file share was created.
   */
  created: string;

  /**
   * Secret token used to access the associated file.
   */
  token: string;

  /**
   * Human friendly name for this share token.
   */
  name?: string;

  /**
   * The unix timestamp (in milliseconds) this file share will expire.
   *
   * TODO: in future we could add a special value like "forever", but this should
   * not be the default.
   */
  valid_until: number;
};

/**
 * Attributes of a file that represent a serialised version of the file.
 */
export interface FileShareJSON {
  /**
   * Unique ID share instance
   */
  id: string;
  /**
   * ISO timestamp the share was created
   */
  created: FileShare['created'];
  /**
   * Unix timestamp (in milliseconds) of when this share expires
   */
  validUntil: FileShare['valid_until'];
  /**
   * A user-friendly name for the file share
   */
  name?: FileShare['name'];
  /**
   * The ID of the file this share is linked to
   */
  fileId: string;
}

/**
 * A version of the file share with a token included.
 *
 * @note This should only be shown when the file share is first created
 */
export type FileShareJSONWithToken = FileShareJSON & {
  /**
   * Secret token that can be used to access files
   */
  token: string;
};

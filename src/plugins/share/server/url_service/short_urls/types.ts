/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Fields that stored in the short url saved object.
 */
export interface ShortUrlSavedObjectAttributes {
  /**
   * The slug of the short URL, the part after the `/` in the URL.
   */
  readonly slug: string;

  /**
   * Number of times the short URL has been resolved.
   */
  readonly accessCount: number;

  /**
   * The timestamp of the last time the short URL was resolved.
   */
  readonly accessDate: number;

  /**
   * The timestamp when the short URL was created.
   */
  readonly createDate: number;

  /**
   * Serialized locator state.
   */
  readonly locatorJSON: string;

  /**
   * Legacy field - was used in old short URL versions. This field will
   * be removed in a future by a migration.
   *
   * @deprecated
   */
  readonly url: string;
}

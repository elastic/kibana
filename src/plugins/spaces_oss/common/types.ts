/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * A Space.
 */
export interface Space {
  /**
   * The unique identifier for this space.
   * The id becomes part of the "URL Identifier" of the space.
   *
   * Example: an id of `marketing` would result in the URL identifier of `/s/marketing`.
   */
  id: string;

  /**
   * Display name for this space.
   */
  name: string;

  /**
   * Optional description for this space.
   */
  description?: string;

  /**
   * Optional color (hex code) for this space.
   * If neither `color` nor `imageUrl` is specified, then a color will be automatically generated.
   */
  color?: string;

  /**
   * Optional display initials for this space's avatar. Supports a maximum of 2 characters.
   * If initials are not provided, then they will be derived from the space name automatically.
   *
   * Initials are not displayed if an `imageUrl` has been specified.
   */
  initials?: string;

  /**
   * Optional base-64 encoded data image url to show as this space's avatar.
   * This setting takes precedence over any configured `color` or `initials`.
   */
  imageUrl?: string;

  /**
   * The set of feature ids that should be hidden within this space.
   */
  disabledFeatures: string[];

  /**
   * Indicates that this space is reserved (system controlled).
   * Reserved spaces cannot be created or deleted by end-users.
   * @private
   */
  _reserved?: boolean;
}

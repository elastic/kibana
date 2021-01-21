/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * The read-only set of capabilities available for the current UI session.
 * Capabilities are simple key-value pairs of (string, boolean), where the string denotes the capability ID,
 * and the boolean is a flag indicating if the capability is enabled or disabled.
 *
 * @public
 */
export interface Capabilities {
  /** Navigation link capabilities. */
  navLinks: Record<string, boolean>;

  /** Management section capabilities. */
  management: {
    [sectionId: string]: Record<string, boolean>;
  };

  /** Catalogue capabilities. Catalogue entries drive the visibility of the Kibana homepage options. */
  catalogue: Record<string, boolean>;

  /** Custom capabilities, registered by plugins. */
  [key: string]: Record<string, boolean | Record<string, boolean>>;
}

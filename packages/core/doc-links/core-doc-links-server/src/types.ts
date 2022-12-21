/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DocLinks } from '@kbn/doc-links';

/** @public */
export interface DocLinksServiceSetup {
  /** The branch/version the docLinks are pointing to */
  readonly version: string;
  /** The base url for the elastic website */
  readonly elasticWebsiteUrl: string;
  /** A record of all registered doc links */
  readonly links: DocLinks;
}

/** @public */
export type DocLinksServiceStart = DocLinksServiceSetup;

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
  readonly version: string;
  readonly elasticWebsiteUrl: string;
  readonly links: DocLinks;
}

/** @public */
export type DocLinksServiceStart = DocLinksServiceSetup;

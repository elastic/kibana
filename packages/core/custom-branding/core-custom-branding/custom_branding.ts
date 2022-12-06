/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Combined parts of custom branding
 * Properties are each optional to provide flexibility for the Kibana
 * operator
 */
export interface CustomBranding {
  /** Similar to iconType
   * @example 'logoGithub'
   * This is refering to the elastic logo in the top left
   * */
  logo?: string;
  /** Set as string
   * link to a file service
   * */
  favicon?: string;
  /** Instead of elastic, Kibana operators can customize the title */
  pageTitle?: string;
  /**
   * equivalent to Elastic Mark
   * @link packages/core/chrome/core-chrome-browser-internal/src/ui/header/elastic_mark.tsx
   */
  customizedLogo?: string;
}

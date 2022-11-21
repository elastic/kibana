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

/** @public */
export interface CustomBranding {
  /** Similar to iconType
   * @example 'logoGithub'
   * This is refering to the elastic logo in the top left
   * */
  logo?: string;
  /** Set as string
   * @example href={`${uiPublicURL}/favicons/favicon.png`
   * need to support only SVG, PNG, GIF files
   * */
  favicon?: string;
  /** Instead of elastic, Kibana operators can customize the title */
  pageTitle?: string;
  /** This logo is the loading progress logo that by default is the elastic cluster */
  customizedLogo?: string;
}

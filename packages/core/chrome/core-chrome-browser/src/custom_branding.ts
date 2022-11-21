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
  /* similar to iconType
   * @example 'logoGithub'*/
  logo?: string;
  /** will be set as string even if .png
   * @example href={`${uiPublicURL}/favicons/favicon.png`
   * */
  favicon?: string;
  pageTitle?: string;
  customizedLogo?: string;
}

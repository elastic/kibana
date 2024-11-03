/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export interface CustomBranding {
  /**
   * Custom replacement for the Elastic logo in the top lef *
   * */
  logo?: string;
  /**
   * Custom replacement for favicon in SVG format
   */
  faviconSVG?: string;
  /**
   * Custom page title
   */
  pageTitle?: string;
  /**
   * Custom replacement for Elastic Mark
   * @link packages/core/chrome/core-chrome-browser-internal/src/ui/header/elastic_mark.tsx
   */
  customizedLogo?: string;
  /**
   * Custom replacement for favicon in PNG format
   */
  faviconPNG?: string;
}

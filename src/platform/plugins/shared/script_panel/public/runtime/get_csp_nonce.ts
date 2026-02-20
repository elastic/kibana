/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

let cachedNonce: string | undefined;

/**
 * Reads the CSP nonce from the `<meta name="kbn-csp-nonce">` tag in `<head>`.
 * The nonce is generated per-request by the server and included in the
 * page's CSP header, allowing sandboxed iframe srcdoc content to use
 * inline scripts when tagged with this nonce.
 */
export const getKibanaCspNonce = (): string | undefined => {
  if (cachedNonce !== undefined) {
    return cachedNonce;
  }

  const metaEl = document.querySelector('meta[name="kbn-csp-nonce"]');
  cachedNonce = metaEl?.getAttribute('content') ?? undefined;

  return cachedNonce;
};

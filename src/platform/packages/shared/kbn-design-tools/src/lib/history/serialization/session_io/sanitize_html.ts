/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import DOMPurify from 'dompurify';

/**
 * Lazily-initialized DOMPurify instance with a hook to strip external
 * `xlink:href` / `href` attributes (only fragment references allowed).
 */
const purifier = (() => {
  const instance = DOMPurify();
  instance.addHook('afterSanitizeAttributes', (node) => {
    const href = node.getAttribute('xlink:href') ?? node.getAttribute('href');
    if (href && !href.startsWith('#')) {
      node.removeAttribute('xlink:href');
      node.removeAttribute('href');
    }
  });
  return instance;
})();

/**
 * Sanitize HTML to prevent script execution when importing untrusted
 * outerHTML.
 *
 * @param html - The raw HTML string.
 * @returns The sanitized HTML string.
 */
export const sanitizeHTML = (html: string): string => {
  return purifier.sanitize(html, {
    ADD_TAGS: ['use'],
    ADD_ATTR: ['xlink:href', 'data-icon-type'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
  });
};

/**
 * Sanitize inline CSS text to prevent script execution.
 *
 * Applies the styles to a detached element and reads them back via
 * `style.cssText`. The browser's CSS parser rejects any non-standard
 * constructs (e.g. `expression()`, `behavior:`, `javascript:`,
 * `-moz-binding:`) without needing fragile regex patterns.
 *
 * @param raw - The raw CSS text.
 * @returns The sanitized CSS text.
 */
export const sanitizeInlineStyles = (raw: string): string => {
  const scratch = document.createElement('div');
  scratch.style.cssText = raw;
  const cleaned = scratch.style.cssText;
  // Preserve internal fragment references (url(#id)) used by SVG
  // clip-paths/masks, but strip external URLs that could load resources.
  return cleaned.replace(/url\(([^)]*)\)/gi, (_match, inner) => {
    const trimmed = inner.trim().replace(/^["']|["']$/g, '');
    if (trimmed.startsWith('#')) return _match;
    return 'url("")';
  });
};

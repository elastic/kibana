/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Converts a relative path to an absolute url.
 * Implementation is based on a specified behavior of the browser to automatically convert
 * a relative url to an absolute one when setting the `href` attribute of a `<a>` html element.
 *
 * @example
 * ```ts
 * // current url: `https://kibana:8000/base-path/app/my-app`
 * relativeToAbsolute('/base-path/app/another-app') => `https://kibana:8000/base-path/app/another-app`
 * ```
 */
export const relativeToAbsolute = (url: string): string => {
  const a = document.createElement('a');
  a.setAttribute('href', url);
  return a.href;
};

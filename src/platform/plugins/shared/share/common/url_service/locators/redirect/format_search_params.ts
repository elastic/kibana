/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compressToBase64 } from 'lz-string';
import { RedirectOptions } from './types';

export interface FormatSearchParamsOptions {
  lzCompress?: boolean;
}

export function formatSearchParams(
  opts: RedirectOptions,
  { lzCompress }: FormatSearchParamsOptions = {}
): URLSearchParams {
  const searchParams = new URLSearchParams();

  searchParams.set('l', opts.id);
  searchParams.set('v', opts.version);

  const json = JSON.stringify(opts.params);

  if (lzCompress) {
    const compressed = compressToBase64(json);
    searchParams.set('lz', compressed);
  } else {
    searchParams.set('p', JSON.stringify(opts.params));
  }

  return searchParams;
}

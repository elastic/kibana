/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EbtClickAttrs } from './types';

/** Maps an EbtClickAttrs object to the corresponding `data-ebt-*` HTML attributes. */
export function getEbtProps(ebt: EbtClickAttrs): {
  'data-ebt-action': string;
  'data-ebt-element': string;
  'data-ebt-detail'?: string;
} {
  return {
    'data-ebt-action': ebt.action,
    'data-ebt-element': ebt.element,
    ...(ebt.detail && { 'data-ebt-detail': ebt.detail }),
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { VegaByValueState } from '../../server';

type VegaSpec = VegaByValueState['spec'];

/** The text the spec editor shows for a spec. */
export const specToEditorValue = (spec: VegaSpec): string =>
  spec.format === 'json' ? JSON.stringify(spec.value, null, 2) : spec.value;

/** The spec for the text in the editor, keeping JSON only while it still parses. */
export const specFromEditor = (text: string, format: VegaSpec['format']): VegaSpec => {
  if (format === 'json') {
    try {
      return { format: 'json', value: JSON.parse(text) };
    } catch {
      return { format: 'hjson', value: text };
    }
  }
  return { format: 'hjson', value: text };
};

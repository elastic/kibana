/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { copyToClipboard } from '@elastic/eui';

export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (!text) {
    return false;
  }

  // TS types declare `navigator.clipboard` as always present, but the spec marks it
  // [SecureContext]: it is absent on insecure (plain-HTTP) origins, which self-hosted
  // Kibana commonly runs on, and can be missing/partial in test environments.
  // https://w3c.github.io/clipboard-apis/#navigator-interface
  // https://developer.mozilla.org/en-US/docs/Web/API/Navigator/clipboard
  if (typeof window.navigator.clipboard?.writeText === 'function') {
    try {
      await window.navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to the document-copy helper below.
    }
  }

  try {
    if (copyToClipboard(text)) {
      return true;
    }
  } catch {
    // Ignore and fall through to return false.
  }

  return false;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { installTranslationResilience } from 'translation-resilience';

declare global {
  interface Window {
    __kbnTranslationsTelemetryEmitter__?: (message: string) => void;
  }
}

// Loaded only when the user opts in, and before the shared-deps scripts, so the
// DOM patch is in place before React evaluates.
installTranslationResilience({
  eager: false,
  onEvent: (message) => {
    if (typeof window.__kbnTranslationsTelemetryEmitter__ === 'function') {
      window.__kbnTranslationsTelemetryEmitter__(message);
    }
  },
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable } from 'rxjs';
import type { GlobalSearchConfig } from './global_search';

/**
 * Chrome Next rollout APIs.
 *
 * @remarks
 * This namespace starts with the rollout state and will host additional Chrome Next APIs as
 * follow-up feature slices land behind the same flag.
 *
 * @public
 */
export interface ChromeNext {
  /** Whether the Chrome Next feature flag is enabled. */
  readonly isEnabled: boolean;
  /** Global search configuration. */
  globalSearch: {
    /**
     * Set the global search configuration for the Chrome-Next header.
     * Chrome renders a search button; clicking it fires `onClick`.
     * Pass `undefined` to remove. Global — persists across app changes.
     */
    set(config?: GlobalSearchConfig): void;
    /** Observable of the current global search config. */
    get$(): Observable<GlobalSearchConfig | undefined>;
  };
}

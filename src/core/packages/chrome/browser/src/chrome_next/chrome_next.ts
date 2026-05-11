/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

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
}

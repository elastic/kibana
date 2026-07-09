/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ChromeExtensionContent } from '@kbn/core-mount-utils-browser';

/**
 * A single AI button registration for the Chrome-Next global header.
 *
 * `content` is rendered as-is, so the registering owner fully controls the button UI
 * and its visibility. This is intentionally minimal for the transition period: see
 * `ChromeNext['aiButton'].register` for why multiple registrations are allowed today.
 *
 * Tech debt: https://github.com/elastic/kibana/issues/272279
 *
 * @public
 */
export interface GlobalHeaderAiButton {
  content: ChromeExtensionContent;
}

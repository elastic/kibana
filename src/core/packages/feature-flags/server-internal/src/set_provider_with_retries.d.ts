/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import { type Provider } from '@openfeature/server-sdk';
/**
 * Handles the setting of the Feature Flags provider and any retries that may be required.
 * This method is intentionally synchronous (no async/await) to avoid holding Kibana's startup on the feature flags setup.
 * @param provider The OpenFeature provider to set up.
 * @param logger You know, for logging.
 */
export declare function setProviderWithRetries(provider: Provider, logger: Logger): void;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger as OpenFeatureLogger } from '@openfeature/server-sdk';
import type { Logger } from '@kbn/logging';
/**
 * The way OpenFeature logs messages is very similar to the console.log approach,
 * which is not compatible with our LogMeta approach. This can result in our log removing information like any 3rd+
 * arguments passed or the error.message when using log('message', error).
 *
 * This wrapper addresses this by making it ECS-compliant.
 * @param logger The Kibana logger
 */
export declare function createOpenFeatureLogger(logger: Logger): OpenFeatureLogger;

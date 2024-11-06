/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EventGeneratingElementsShouldBeInstrumented } from './rules/event_generating_elements_should_be_instrumented';

/**
 * Custom ESLint rules, add `'@kbn/eslint-plugin-telemetry'` to your eslint config to use them
 * @internal
 */
export const rules = {
  event_generating_elements_should_be_instrumented: EventGeneratingElementsShouldBeInstrumented,
};

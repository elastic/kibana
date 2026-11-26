/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Build-time type validation — causes build failure if types diverge.
import './type_validation';

/**
 * Entry point for the standalone `@kbn/ui-ai-components` package.
 *
 * Re-exports the package's public API unchanged. Kibana-specific dependencies
 * (`@kbn/i18n`) are replaced at build time via webpack aliases.
 */
export * from '../..';

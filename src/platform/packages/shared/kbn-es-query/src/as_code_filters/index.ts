/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * As Code Filter API
 *
 * This module provides utilities for working with As Code filters in Kibana's
 * as Code API endpoints, including type definitions and conversion utilities.
 */

// Conversion utilities
export { FilterConversionError } from './errors';
export { fromStoredFilter } from './from_stored_filter';
export { toStoredFilter } from './to_stored_filter';

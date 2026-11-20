/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** ES|QL marker that activates the custom HTML presentation tab experience. */
export const PRESENTATION_ESQL_MARKER = '__discover_presentation';

/** Default ES|QL query for a presentation tab. */
export const PRESENTATION_ESQL_QUERY = `ROW ${PRESENTATION_ESQL_MARKER} = true`;

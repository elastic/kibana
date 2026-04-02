/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** `type` discriminator for as-code classic-tab `data_source`: saved Kibana data view id. */
export const AS_CODE_DATA_VIEW_REFERENCE_TYPE = 'data_view_reference' as const;

/** `type` discriminator for as-code classic-tab `data_source`: inline DataViewSpec-shaped fields. */
export const AS_CODE_DATA_VIEW_SPEC_TYPE = 'data_view_spec' as const;

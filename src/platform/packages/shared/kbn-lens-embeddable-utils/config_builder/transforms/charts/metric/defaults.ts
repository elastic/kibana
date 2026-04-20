/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Lens-known defaults for Metric chart styling.
 *
 * These are the values Lens applies at runtime when the corresponding
 * property is omitted.  We surface them explicitly in API responses
 * ("complete-out" contract) so the caller receives a fully reproducible
 * chart definition that does not depend on runtime defaults.
 */

export const DEFAULT_PRIMARY_POSITION = 'bottom' as const;
export const DEFAULT_PRIMARY_LABELS_ALIGNMENT = 'left' as const;
export const DEFAULT_PRIMARY_VALUE_ALIGNMENT = 'right' as const;
export const DEFAULT_PRIMARY_VALUE_SIZING = 'auto' as const;
export const DEFAULT_PRIMARY_ICON_ALIGNMENT = 'right' as const;
export const DEFAULT_SECONDARY_LABEL_VISIBLE = true;
export const DEFAULT_SECONDARY_LABEL_PLACEMENT = 'before' as const;
export const DEFAULT_SECONDARY_VALUE_ALIGNMENT = 'right' as const;

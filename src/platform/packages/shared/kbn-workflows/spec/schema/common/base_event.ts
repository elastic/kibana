/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/**
 * Base fields present on every trigger event (injected by the platform).
 * Custom trigger event schemas are merged on top of this for workflow context and autocomplete.
 * Timestamp is only present for event-driven (custom) triggers; see EventTimestampSchema.
 */
export const BaseEventSchema = z.object({
  spaceId: z.string().describe('The space where the event was emitted.'),
});

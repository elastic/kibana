/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TriggerDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';

const ExternalTriggerEventSchema = z.object({
  message: z.string(),
  source: z.string().optional(),
});

export const externalTriggerDefinition: TriggerDefinition<typeof ExternalTriggerEventSchema> = {
  id: 'example.external_trigger',
  description: 'Emitted when an external event occurs. Used by the workflows extensions example plugin.',
  eventSchema: ExternalTriggerEventSchema,
  examples: [
    { message: 'Hello from the example plugin' },
    { message: 'Demo event', source: 'workflows_extensions_example' },
  ],
};

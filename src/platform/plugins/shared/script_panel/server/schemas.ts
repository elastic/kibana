/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { serializedTitlesSchema } from '@kbn/presentation-publishing-schemas';

/**
 * Schema for the script panel's code-related state.
 * Uses snake_case for REST API compatibility.
 */
export const scriptPanelCodeSchema = schema.object({
  /**
   * The user-authored JavaScript code to execute in the sandboxed iframe.
   */
  script_code: schema.string({ defaultValue: '' }),
});

/**
 * Complete schema for the script panel embeddable state.
 * Combines code state with standard title state from presentation-publishing.
 */
export const scriptPanelEmbeddableSchema = schema.allOf(
  [scriptPanelCodeSchema, serializedTitlesSchema],
  {
    meta: {
      description: 'Script panel embeddable schema for sandboxed scriptable visualizations',
    },
  }
);

export type ScriptPanelCodeState = TypeOf<typeof scriptPanelCodeSchema>;
export type ScriptPanelSerializedState = TypeOf<typeof scriptPanelEmbeddableSchema>;

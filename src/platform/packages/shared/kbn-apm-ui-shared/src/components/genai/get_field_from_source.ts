/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import {
  ATTRIBUTE_GEN_AI_INPUT_MESSAGES,
  ATTRIBUTE_GEN_AI_OUTPUT_MESSAGES,
  ATTRIBUTE_GEN_AI_SYSTEM_INSTRUCTIONS,
} from '@kbn/apm-types/es_fields';

/**
 * GenAI fields whose values regularly exceed the `ignore_above: 1024` limit of
 * the `attributes.*` keyword mappings. The ES fields API omits ignored values
 * (the doc lists them under `_ignored`), so these must be read from `_source`.
 *
 * Keep in sync with the server-side twin in the APM plugin
 * (`server/routes/event_metadata/merge_long_fields_from_source.ts`) — the
 * server cannot import this browser package.
 */
export const GEN_AI_LONG_MESSAGE_FIELDS = [
  ATTRIBUTE_GEN_AI_INPUT_MESSAGES,
  ATTRIBUTE_GEN_AI_OUTPUT_MESSAGES,
  ATTRIBUTE_GEN_AI_SYSTEM_INSTRUCTIONS,
] as const;

/**
 * Reads a dotted field path from a document `_source`, accounting for the two
 * shapes it can take depending on the ingest path:
 *
 * - OTel documents keep attribute names as flattened dotted keys INSIDE a
 *   top-level container object, e.g.
 *   `_source.attributes['gen_ai.input.messages']`.
 * - Classic APM documents store fully nested objects, e.g.
 *   `_source.span.id`.
 */
export function getFieldFromSource(source: unknown, fieldName: string): unknown {
  if (source == null || typeof source !== 'object') {
    return undefined;
  }

  // Flattened key inside a top-level container, e.g.
  // 'attributes.gen_ai.input.messages' -> source.attributes['gen_ai.input.messages']
  const separatorIndex = fieldName.indexOf('.');
  if (separatorIndex > 0) {
    const container = (source as Record<string, unknown>)[fieldName.slice(0, separatorIndex)];
    if (container != null && typeof container === 'object') {
      const flattenedValue = (container as Record<string, unknown>)[
        fieldName.slice(separatorIndex + 1)
      ];
      if (flattenedValue !== undefined) {
        return flattenedValue;
      }
    }
  }

  // Fully nested path (also covers a fully flattened top-level key via get()).
  return get(source, fieldName);
}

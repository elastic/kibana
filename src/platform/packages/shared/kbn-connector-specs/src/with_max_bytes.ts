/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

/** Marks an input that only `xpack.actions.maxPayloadSize` bounds, because the vendor documents no limit. */
export const PLATFORM_MAX_BYTES = 'xpack.actions.maxPayloadSize';

export interface InputMaxBytes {
  maxBytes: number | typeof PLATFORM_MAX_BYTES;
}

// A private registry keeps the marker out of the JSON Schemas sent to LLM providers and workflow tooling.
export const inputMaxBytesRegistry = z.registry<InputMaxBytes>();

const getJsonByteLength = (value: unknown): number | undefined => {
  try {
    const json = JSON.stringify(value);
    return json === undefined ? 0 : new TextEncoder().encode(json).byteLength;
  } catch {
    return undefined;
  }
};

/**
 * Bounds a free-form, record, or recursive input by its UTF-8 JSON size. Pass the vendor's documented limit;
 * omit it when the vendor documents none, so `xpack.actions.maxPayloadSize` is the only bound.
 */
export const withMaxBytes = <T extends z.ZodType>(schema: T, maxBytes?: number): T => {
  if (maxBytes === undefined) {
    // Registry entries are inherited by clones, so marking a clone leaves other uses of `schema` unmarked.
    const marked = schema.clone();
    inputMaxBytesRegistry.add(marked, { maxBytes: PLATFORM_MAX_BYTES });
    return marked;
  }
  const bounded = schema.refine(
    (value) => {
      const byteLength = getJsonByteLength(value);
      return byteLength !== undefined && byteLength <= maxBytes;
    },
    { message: `Must be JSON-serializable and at most ${maxBytes} bytes once serialized` }
  );
  inputMaxBytesRegistry.add(bounded, { maxBytes });
  return bounded;
};

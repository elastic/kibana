/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonCompatible } from '@kbn/utility-types';

declare const dataType: unique symbol;

/**
 * A topic name plus the compile-time type of its event data.
 * Creating a topic does not register it. Topic names are unique across Kibana.
 * Event data is delivered to consumers as a JSON round trip, so `TData` must be a JSON-compatible
 * object; `defineTopic` enforces this at compile time with `JsonCompatible` from `@kbn/utility-types`.
 *
 * @public
 */
export interface Topic<TData = unknown> {
  readonly name: string;
  readonly [dataType]?: TData;
}

const TOPIC_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]{0,255}$/;

/**
 * Returns a topic token. Registration is a separate setup call.
 * Fails to compile when `TData` is not a plain object or holds values that do not survive a JSON
 * round trip (`Date`, `Map`, `Set`, objects with methods, functions, `bigint`, `symbol`,
 * `undefined` array items). Instances of data-only classes are delivered as plain objects.
 */
export const defineTopic = <TData extends JsonCompatible<TData>>(name: string): Topic<TData> => {
  if (!TOPIC_NAME_PATTERN.test(name)) {
    throw new Error(
      `Topic name "${name}" is invalid. Use a letter followed by letters, numbers, ".", "_" or "-".`
    );
  }

  return { name };
};

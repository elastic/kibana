/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

declare const dataType: unique symbol;

/**
 * A topic name plus the compile-time type of its event data.
 * Creating a topic does not register it. Topic names are unique across Kibana.
 *
 * @public
 */
export interface Topic<TData> {
  readonly name: string;
  readonly [dataType]?: TData;
}

const TOPIC_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]{0,255}$/;

/**
 * Returns a topic token. Registration is a separate setup call.
 *
 * `TData` must be given explicitly: without it the topic's data type is `never`, so nothing can be
 * published on it. The type is not checked for JSON safety; event data is delivered as a JSON
 * round trip, and in development mode `publish` rejects data that would not survive it
 * (`Date`, `Map`, `Set`, class instances, `NaN`, `undefined` array items, ...).
 */
export const defineTopic = <TData = never>(name: string): Topic<TData> => {
  if (!TOPIC_NAME_PATTERN.test(name)) {
    throw new Error(
      `Topic name "${name}" is invalid. Use a letter followed by letters, numbers, ".", "_" or "-".`
    );
  }

  return { name };
};

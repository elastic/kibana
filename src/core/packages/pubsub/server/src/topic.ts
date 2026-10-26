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
export interface Topic<TData = unknown> {
  readonly name: string;
  readonly [dataType]?: TData;
}

/** A topic name is at most this many characters. */
const TOPIC_NAME_MAX_LENGTH = 256;

/**
 * Dot-separated segments. Each segment starts with a letter, so `a..b` and a trailing `.` are
 * rejected. Digits, `_` and `-` may follow the first letter of a segment.
 */
const TOPIC_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*(\.[a-zA-Z][a-zA-Z0-9_-]*)*$/;

/**
 * Returns a topic token. Registration is a separate setup call.
 *
 * Producers and consumers each call this with the same name and a shared data type. Don't import
 * another plugin's token: that is a runtime dependency, and a consumer must not have to depend on
 * the producer. Share the data type instead (a type-only import, or a small types-only package
 * when two plugins would otherwise reference each other).
 */
export const defineTopic = <TData = unknown>(name: string): Topic<TData> => {
  if (name.length > TOPIC_NAME_MAX_LENGTH || !TOPIC_NAME_PATTERN.test(name)) {
    throw new Error(
      `Topic name "${name}" is invalid. Use dot-separated segments of letters, numbers, "_" or "-", each starting with a letter.`
    );
  }

  return { name };
};

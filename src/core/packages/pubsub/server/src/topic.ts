/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

declare const payloadType: unique symbol;

/**
 * A topic name plus the compile-time type of its payload.
 * Creating a topic does not register it.
 */
export interface Topic<TPayload = unknown> {
  readonly name: string;
  readonly [payloadType]?: TPayload;
}

const TOPIC_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9._-]{0,255}$/;

/** Returns a topic token. Registration is a separate setup call. */
export const defineTopic = <TPayload = unknown>(name: string): Topic<TPayload> => {
  if (!TOPIC_NAME_PATTERN.test(name)) {
    throw new Error(
      `Topic name "${name}" is invalid. Use a letter followed by letters, numbers, ".", "_" or "-".`
    );
  }

  return { name };
};

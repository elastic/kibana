/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

declare const dataType: unique symbol;
/** Present on {@link Topic} so event data, even with a `name` field, is not a topic type. */
declare const topicBrand: unique symbol;

/**
 * A topic name plus the compile-time type of its event data.
 * Creating a topic does not register it. Topic names are unique across Kibana.
 *
 * Share one of these from a types-only package (`Topic<PingData, 'pubsubExample.ping'>`) and pass
 * it to {@link defineTopic}, so a typo in the name fails to compile. Two plugins that import that
 * package do not reference each other.
 *
 * @public
 */
export interface Topic<TData = never, TName extends string = string> {
  readonly name: TName;
  readonly [dataType]?: TData;
  readonly [topicBrand]: true;
}

/** A topic name is at most this many characters. */
const TOPIC_NAME_MAX_LENGTH = 256;

/**
 * Dot-separated segments. Each segment starts with a letter, so `a..b` and a trailing `.` are
 * rejected. Digits, `_` and `-` may follow the first letter of a segment.
 */
const TOPIC_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]*(\.[a-zA-Z][a-zA-Z0-9_-]*)*$/;

/**
 * Rejects a topic name that {@link defineTopic} would reject. Used when a caller can skip
 * `defineTopic` with a cast.
 *
 * @internal
 */
export const assertTopicName = (name: string): void => {
  if (name.length > TOPIC_NAME_MAX_LENGTH || !TOPIC_NAME_PATTERN.test(name)) {
    throw new Error(
      `Topic name "${name}" is invalid. Use dot-separated segments of letters, numbers, "_" or "-", each starting with a letter.`
    );
  }
};

/**
 * Returns a topic token. Registration is a separate setup call.
 *
 * Pass a shared {@link Topic} type so the name is checked. Producers and consumers each call this.
 * Don't import another plugin's token. Share the topic type from a small types-only package so the
 * plugins don't reference each other.
 *
 * ```ts
 * type PingTopic = Topic<PingData, 'pubsubExample.ping'>;
 * defineTopic<PingTopic>('pubsubExample.ping');
 * ```
 *
 * A type argument is required. `Topic` defaults to `never` data, so a name-only topic
 * (`Topic<never, 'orders'>`) cannot be published on.
 */
export const defineTopic = <TTopic extends Topic<unknown, string> = never>(
  name: [TTopic] extends [never] ? never : TTopic['name']
): TTopic => {
  assertTopicName(name);

  // The brand exists only in the type. The runtime token is the name.
  return { name } as unknown as TTopic;
};

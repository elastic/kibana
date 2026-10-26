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

type DefineTopicName<T> = [T] extends [never]
  ? string
  : [T] extends [Topic<unknown, infer TName>]
  ? TName
  : string;

type DefineTopicResult<T> = [T] extends [never]
  ? Topic<never, string>
  : [T] extends [Topic<infer TData, infer TName extends string>]
  ? Topic<TData, TName>
  : Topic<T, string>;

/**
 * Returns a topic token. Registration is a separate setup call.
 *
 * Pass the event data, or a shared {@link Topic} type so the name is checked too. Producers and
 * consumers each call this. Don't import another plugin's token. Share the topic type from a small
 * types-only package so the plugins don't reference each other.
 *
 * ```ts
 * type PingTopic = Topic<PingData, 'pubsubExample.ping'>;
 * defineTopic<PingData>('pubsubExample.ping');
 * defineTopic<PingTopic>('pubsubExample.ping');
 * ```
 *
 * With no type argument the data type is `never`.
 */
export const defineTopic = <T = never>(name: DefineTopicName<T>): DefineTopicResult<T> => {
  if (name.length > TOPIC_NAME_MAX_LENGTH || !TOPIC_NAME_PATTERN.test(name)) {
    throw new Error(
      `Topic name "${name}" is invalid. Use dot-separated segments of letters, numbers, "_" or "-", each starting with a letter.`
    );
  }

  // The brand exists only in the type. The runtime token is the name.
  return { name } as unknown as DefineTopicResult<T>;
};

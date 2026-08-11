/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OasdiffEntry } from '../parse_oasdiff';
import type { RequestBodyConsumer, RequestBodyIndex } from '../build_request_body_index';
import { buildEntry } from './build_entry';
import { makeSkipKey } from './make_skip_key';
import type { ComponentTightening, SkipKey } from './types';

interface Expansion {
  consumer: RequestBodyConsumer;
  pointer: string;
  upperMethod: string;
}

interface ExpandResult {
  entries: OasdiffEntry[];
  warnings: string[];
  skipKeys: Set<SkipKey>;
}

const zeroConsumersWarning = (componentName: string): string =>
  `Component schema '${componentName}' tightened additionalProperties but has zero request-body consumers; entry intentionally dropped.`;

const expansionsFor = (pointers: string[], consumers: RequestBodyConsumer[]): Expansion[] =>
  consumers.flatMap((consumer) =>
    pointers.map((pointer) => ({
      consumer,
      pointer,
      upperMethod: consumer.method.toUpperCase(),
    }))
  );

const expandOne = (
  { componentName, pointers }: ComponentTightening,
  index: RequestBodyIndex
): ExpandResult => {
  const consumers = index.get(componentName) ?? [];
  if (consumers.length === 0) {
    return { entries: [], warnings: [zeroConsumersWarning(componentName)], skipKeys: new Set() };
  }
  const expansions = expansionsFor(pointers, consumers);
  return {
    entries: expansions.map(({ consumer, upperMethod, pointer }) =>
      buildEntry({
        path: consumer.path,
        method: upperMethod,
        source: `/components/schemas/${componentName}${pointer}`,
      })
    ),
    warnings: [],
    skipKeys: new Set(
      expansions.map(({ consumer, upperMethod, pointer }) =>
        makeSkipKey(consumer.path, upperMethod, pointer)
      )
    ),
  };
};

export const expandComponentTightenings = (
  componentTightenings: ComponentTightening[],
  index: RequestBodyIndex
): ExpandResult => {
  const expanded = componentTightenings.map((tightening) => expandOne(tightening, index));
  return {
    entries: expanded.flatMap((e) => e.entries),
    warnings: expanded.flatMap((e) => e.warnings),
    skipKeys: new Set(expanded.flatMap((e) => [...e.skipKeys])),
  };
};

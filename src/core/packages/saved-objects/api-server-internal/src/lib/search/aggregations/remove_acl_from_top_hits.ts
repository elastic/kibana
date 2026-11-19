/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject } from 'lodash';
import { matchesAclField } from '../../utils';

type Hit = Record<string, unknown> & {
  fields?: Record<string, unknown>;
  highlight?: Record<string, unknown>;
};

interface TopHitsResult {
  hits: Record<string, unknown> & { hits: Hit[] };
}

const isTopHitsResult = (
  node: Record<string, unknown>
): node is Record<string, unknown> & TopHitsResult =>
  isPlainObject(node.hits) && Array.isArray((node.hits as Record<string, unknown>).hits);

const withoutAclKeys = (values: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(values).filter(([name]) => !matchesAclField(name)));

const removeAclFromHit = (hit: Hit): Hit => ({
  ...hit,
  ...(hit.fields && { fields: withoutAclKeys(hit.fields) }),
  ...(hit.highlight && { highlight: withoutAclKeys(hit.highlight) }),
});

/**
 * Removes the stored ACL from the hits of every `top_hits` result in an aggregations response.
 * `docvalue_fields` and `highlight` accept field patterns, so a pattern such as `*` returns ACL
 * values in a hit's `fields` or `highlight`. A `top_hits` can sit under any bucket aggregation, so
 * this walks the whole response and cleans every object shaped like a `top_hits` result. The source
 * of each hit already excludes the ACL.
 *
 * @param aggregations The `aggregations` of a search response.
 * @returns A copy without ACL keys in any `top_hits` hit.
 */
export const removeAclFromTopHits = <A>(aggregations: A): A => {
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(visit);
    }
    if (!isPlainObject(node)) {
      return node;
    }
    const object = node as Record<string, unknown>;
    if (isTopHitsResult(object)) {
      // A `top_hits` result has no sub-aggregations, so its hits are not walked further.
      return { ...object, hits: { ...object.hits, hits: object.hits.hits.map(removeAclFromHit) } };
    }
    return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, visit(value)]));
  };
  return visit(aggregations) as A;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StoredLinksEmbeddableState } from '../../types';
import { is910State } from './is_legacy_state';
import type { StoredLinksByValueState910, StoredLinksByValueState930, LegacyState } from './types';

export function transformLegacyState(state: LegacyState): StoredLinksEmbeddableState {
  const stateToTransform = is910State(state) ? transform910State(state) : state;

  // 9.3.0 state stored links with an `order` property instead of deriving their order from their array position
  const transformedLinks = [...(stateToTransform.links ?? [])].sort((linkA, linkB) => {
    return linkA.order - linkB.order;
  });

  return {
    ...stateToTransform,
    links: transformedLinks,
  };
}

function transform910State(state: StoredLinksByValueState910): StoredLinksByValueState930 {
  // 9.1.0 by-value state stored state under attributes
  const { attributes, ...rest } = state;
  return {
    ...attributes,
    ...rest,
  };
}

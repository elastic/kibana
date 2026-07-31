/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObjectType } from '../../../utils/is_plain_object_type';
import { X_STATE } from '../../known_custom_props';
import type { DocumentNodeProcessor } from './types/document_node_processor';

/**
 * Matches the version suffix `getXState` (in `@kbn/router-to-openapispec`) appends to an
 * `x-state` that already carries a stability tier, for example
 * `"Generally available; added in 9.5.0"`. Case-insensitive and whitespace-tolerant to
 * also match the hand-written variants found in bundled specs (`"; Added in 9.5.0"`).
 */
const X_STATE_VERSION_SUFFIX = /;\s*added in\s+.+$/i;

/**
 * Matches a bare version `x-state` with no stability tier, for example `"Added in 9.5.0"`.
 * `getXState` emits this form when a route declares `since` but no `stability`.
 */
const X_STATE_BARE_VERSION = /^\s*added in\s+.+$/i;

/**
 * Creates a node processor that removes the "added in <version>" fragment from `x-state`
 * values.
 *
 * Elastic Cloud Serverless has no stack version, so an "added in <version>" note is
 * meaningless there. The programmatic route already accounts for this: `getXState` in
 * `@kbn/router-to-openapispec` appends the version only when `!env.serverless`. The
 * manual-YAML route (this bundler) has no equivalent guard and copies `x-state` verbatim,
 * so a hand-authored version leaks into the serverless bundle. This processor gives the
 * serverless bundle the same result `getXState` produces:
 *
 * - `"Generally available; added in 9.5.0"` -> `"Generally available"`
 * - `"Technical Preview; added in 9.4.0"`   -> `"Technical Preview"`
 * - `"Added in 9.5.0"` (bare, no tier)       -> `""`
 *
 * The stability tier is always preserved; only the version is stripped. It is intended to
 * run for serverless bundles only (see `withStripXStateVersionProcessor`).
 */
export const createStripXStateVersionProcessor = (): DocumentNodeProcessor => {
  return {
    onNodeLeave(node) {
      if (!isPlainObjectType(node) || !Object.hasOwn(node, X_STATE)) {
        return;
      }

      const xState = node[X_STATE];

      if (typeof xState !== 'string') {
        return;
      }

      // A bare version carries no stability tier, so nothing is left once the version goes.
      // Mirror `getXState`, which produces an empty state string in this case.
      if (X_STATE_BARE_VERSION.test(xState)) {
        node[X_STATE] = '';
        return;
      }

      node[X_STATE] = xState.replace(X_STATE_VERSION_SUFFIX, '');
    },
  };
};

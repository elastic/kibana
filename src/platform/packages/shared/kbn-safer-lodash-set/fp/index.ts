/*
 * This file is forked from the lodash project (https://lodash.com/),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `src/platform/packages/shared/kbn-safer-lodash-set/LICENSE` for more information.
 */

import convert from 'lodash/fp/convert';
import placeholder from 'lodash/fp/placeholder';
import { set as baseSet, setWith as baseSetWith } from '..';

/**
 * Functional programming style `set` - curried and with iteratee-first argument order.
 *
 * @example
 * set('a.b.c')(value)(object)
 * set('a.b.c', value)(object)
 * set('a.b.c', value, object)
 */
const set = convert('set', baseSet);
set.placeholder = placeholder;

/**
 * Functional programming style `setWith` - curried and with iteratee-first argument order.
 */
const setWith = convert('setWith', baseSetWith);
setWith.placeholder = placeholder;

// Aliases
const assoc = set;
const assocPath = set;

export { set, setWith, assoc, assocPath };
// eslint-disable-next-line import/no-default-export
export default { set, setWith, assoc, assocPath };

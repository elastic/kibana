/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/elastic-safer-lodash-set/LICENSE` more information.
 */

const set = require('../lodash/set');
const { cloneDeep, curry } = require('lodash');

module.exports = curry((b, c, a) => set(cloneDeep(a), b, c));

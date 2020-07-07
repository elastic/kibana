/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/elastic-safer-lodash-set/LICENSE` for more information.
 */

const setWith = require('../lodash/setWith');
const { cloneDeep, curry } = require('lodash');

module.exports = curry((d, b, c, a) => setWith(cloneDeep(a), b, c, d));

/*
 * This file is forked from the lodash project (https://lodash.com/),
 * and may include modifications made by Elasticsearch B.V.
 * Elasticsearch B.V. licenses this file to you under the MIT License.
 * See `packages/elastic-safer-lodash-set/LICENSE` for more information.
 */

/*eslint no-var:0 */
var convert = require('lodash/fp/convert');
var func = convert('set', require('../set'));

func.placeholder = require('lodash/fp/placeholder');
module.exports = func;

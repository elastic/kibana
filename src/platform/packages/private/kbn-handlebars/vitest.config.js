/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `src/platform/packages/private/kbn-handlebars/LICENSE` for more information.
 */

const { createKbnVitestConfig } = require('@kbn/test/vitest/preset');

module.exports = createKbnVitestConfig({
  environment: 'jsdom',
  roots: [
    'src/platform/packages/private/kbn-handlebars',
  ],
});

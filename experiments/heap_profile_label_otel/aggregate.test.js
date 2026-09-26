/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const assert = require('assert');
const {
  UNLABELED,
  OTHER,
  taskTypeFromLabels,
  aggregateProfile,
  collapseTopN,
} = require('./scrape_export');

assert.strictEqual(taskTypeFromLabels(undefined), UNLABELED);
assert.strictEqual(taskTypeFromLabels({}), UNLABELED);
assert.strictEqual(
  taskTypeFromLabels({ 'task.type': 'alerting:monitoring' }),
  'alerting:monitoring'
);

const { external, sampled, sampleCounts } = aggregateProfile({
  externalBytes: [
    { labels: { 'task.type': 'reports:execute' }, bytes: 100 },
    { labels: { 'task.type': 'reports:execute' }, bytes: 50 },
    { labels: {}, bytes: 7 },
  ],
  samples: [
    { size: 128, count: 4, labels: { 'task.type': 'alerting:monitoring' } },
    { size: 64, count: 2, labels: {} },
  ],
});

assert.strictEqual(external.get('reports:execute'), 150);
assert.strictEqual(external.get(UNLABELED), 7);
assert.strictEqual(sampled.get('alerting:monitoring'), 512);
assert.strictEqual(sampled.get(UNLABELED), 128);
assert.strictEqual(sampleCounts.get('alerting:monitoring'), 4);

const collapsed = collapseTopN(
  new Map([
    ['a', 10],
    ['b', 9],
    ['c', 1],
  ]),
  2
);
assert.strictEqual(collapsed.get('a'), 10);
assert.strictEqual(collapsed.get('b'), 9);
assert.strictEqual(collapsed.get(OTHER), 1);

// eslint-disable-next-line no-console
console.log('aggregate.test.js ok');

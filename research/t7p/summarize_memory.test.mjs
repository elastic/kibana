import assert from 'node:assert/strict';
import test from 'node:test';
import { mixBytes, percentile, scaleFamily, slotsThatFit } from './summarize_memory.mjs';

test('percentile uses inclusive nearest rank', () => {
  const values = Array.from({ length: 20 }, (_, i) => i + 1);
  assert.equal(percentile(values, 50), 10);
  assert.equal(percentile(values, 95), 19);
  assert.equal(percentile([5, 1, 4], 50), 4);
});

test('slotsThatFit counts whole islands under the pod limit', () => {
  assert.equal(slotsThatFit(1000, 400, 2000), 2);
  assert.equal(slotsThatFit(1800, 400, 2000), 0);
  assert.equal(slotsThatFit(2500, 400, 2000), 0);
  assert.equal(slotsThatFit(500, 0, 2000), Number.POSITIVE_INFINITY);
});

test('mixBytes is null until every class has a byte count', () => {
  assert.equal(mixBytes('6/3/1', { alerting: 10, workflow: null, agent: 1 }), null);
  assert.equal(mixBytes('6/3/1', { alerting: 10, workflow: 3, agent: 1 }), 70);
  assert.equal(mixBytes('2/2/1', { alerting: 10, workflow: 3, agent: 1 }), 27);
});

test('scaleFamily does not invent a ratio from a zero baseline', () => {
  assert.equal(scaleFamily(92, 0, 200), null);
  assert.equal(scaleFamily(92, 142, 284), 184);
});

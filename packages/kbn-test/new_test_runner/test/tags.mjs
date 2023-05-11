import { it } from 'node:test'
import assert from 'node:assert/strict'

it('works @sanity', () => {
  assert.equal(1, 1)
})

it('works @sanity and @feature-a', () => {
  assert.equal(2, 2)
})

it('low-priority-test', () => {
  assert.equal(3, 3)
})

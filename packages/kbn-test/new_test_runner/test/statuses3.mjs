import { describe, before, it } from 'node:test'
import assert from 'node:assert/strict'

// describe('feature', () => {
before(() => {
  console.log('before hook')
})

it('works', () => {
  assert.equal(1, 1)
})

it('works again', () => {
  assert.equal(1, 1)
})
// })

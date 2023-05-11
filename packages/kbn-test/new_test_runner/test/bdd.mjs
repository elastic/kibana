import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('top level test', () => {
  it('subtest 1', () => {
    assert.strictEqual(1, 1)
  })

  it('subtest 2', () => {
    assert.strictEqual(2, 2)
  })
})

import { describe, it, before, beforeEach, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'

describe('feature X', () => {
  before(() => {
    // prepare to test
  })

  beforeEach(() => {
    // prepare data for each test
  })

  it('works 1', () => {
    assert.strictEqual(1, 1)
  })

  it('works 2', () => {
    assert.strictEqual(2, 2)
  })

  afterEach(() => {
    // clean up after each test
  })

  after(() => {
    // tests are done
  })
})

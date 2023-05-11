import test from 'node:test'
import assert from 'node:assert/strict'

test('hello', () => {
  const message = 'Hello'
  assert.equal(message, 'Hello', 'checking the greeting')
})

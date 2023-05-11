import { it } from 'node:test'
import assert from 'node:assert/strict'

it.todo('loads data')

// SKIP: <issue link>
it.skip('stopped working', () => {
  assert.equal(2, 5)
})

import test from 'node:test'
import assert from 'node:assert/strict'

test('top level test', async (t) => {
  await t.test('subtest 1', (t) => {
    assert.strictEqual(1, 1)
  })

  await t.test('subtest 2', (t) => {
    assert.strictEqual(2, 2)
  })
})

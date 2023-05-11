// @ts-check
import test from 'node:test'
import assert from 'node:assert/strict'

async function fetchTestData() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(['first', 'second', 'third'])
    }, 1000)
  })
}

test('generated', async (t) => {
  const items = await fetchTestData()

  for (const item of items) {
    await t.test(`test ${item}`, (t) => {
      assert.strictEqual(1, 1)
    })
  }
})

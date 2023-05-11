import { it, mock } from 'node:test'
import assert from 'node:assert/strict'
import esmock from 'esmock'
import { calculate } from './calculator.mjs'

it('adds two numbers', () => {
  assert.equal(calculate('+', 2, 3), 5)
})

it('adds two numbers (mocks add)', async () => {
  const { calculate } = await esmock('./calculator.mjs', {
    './math.mjs': {
      add: () => 20,
    },
  })
  assert.equal(calculate('+', 2, 3), 20)
})

it('adds two numbers (confirm call)', async () => {
  const add = mock.fn(() => 20)
  const { calculate } = await esmock('./calculator.mjs', {
    './math.mjs': {
      add,
    },
  })
  assert.equal(calculate('+', 2, 3), 20)
  assert.deepEqual(add.mock.calls[0].arguments, [2, 3])
})

import { it } from 'node:test'
import assert from 'node:assert/strict'
import { calculate } from './calculator.mjs'

it('adds two numbers', () => {
  assert.strictEqual(calculate('+', 2, 3), 5, '2+3')
})

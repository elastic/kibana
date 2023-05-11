import { it, mock } from 'node:test'
import assert from 'node:assert/strict'

it('returns name', () => {
  const person = {
    name() {
      return 'Joe'
    },
  }
  assert.equal(person.name(), 'Joe')
  mock.method(person, 'name', () => 'Anna')
  assert.equal(person.name(), 'Anna')
  assert.equal(person.name.mock.calls.length, 1)
  person.name.mock.restore()
  assert.equal(person.name(), 'Joe')
})

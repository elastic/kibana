import { it } from 'node:test'
import { expect } from 'chai'

it('fails objects on purpose', () => {
  const person = { name: { first: 'Joe' } }
  expect(person).to.deep.equal({ name: { first: 'Anna' } })
})

import { describe, it } from 'node:test'
// import assert from 'node:assert/strict'
// import assert from 'assert-plus'
import { assert, expect } from 'chai'

describe('Assertions', () => {
  // it('passes with primitives', () => {
  //   assert.equal('Hello', 'Helloz', 'greeting check')
  // })

  // it('fails objects on purpose', () => {
  //   const person = { name: { first: 'Joe' } }
  //   assert.deepEqual(person, { name: { first: 'Anna' } }, 'people')
  // })

  it('finds part of the object', () => {
    const person = { name: { first: 'Joe', last: 'Smith' } }
    expect(person).to.deep.include({ name: { first: 'Joe' } })
  })
})

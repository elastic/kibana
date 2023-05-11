const test = require('node:test')
const spok = require('spok').default

test('complex object', (t) => {
  const person = { name: { first: 'Joe' } }
  spok(t, person, { name: { first: 'Anna' } })
})

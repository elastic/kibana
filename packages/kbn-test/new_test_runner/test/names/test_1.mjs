import { it } from 'node:test'
import { delay } from './utils.mjs'

it('works for 2 seconds', { only: true }, async () => {
  await delay(2000)
})

it.skip('fails', () => {
  throw new Error('Nope')
})

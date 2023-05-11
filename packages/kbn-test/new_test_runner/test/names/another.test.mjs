import { it } from 'node:test'
import { delay } from './utils.mjs'

it('works for 2 seconds', async () => {
  await delay(2000)
})

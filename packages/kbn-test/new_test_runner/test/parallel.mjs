import { describe, it } from 'node:test'
import { delay } from './names/utils.mjs'

describe('parallel tests', { concurrency: true }, () => {
  it('subtest 1', async () => {
    console.log('subtest 1 start')
    await delay(5000)
    console.log('subtest 1 end')
  })

  it('subtest 2', async () => {
    console.log('subtest 2 start')
    await delay(5000)
    console.log('subtest 2 end')
  })
})

import { it } from 'node:test'

it('succeeds', (done) => {
  setTimeout(() => {
    done(new Error('A problem'))
  }, 1000)
})

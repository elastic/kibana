import request from 'request';
import superagent from 'superagent'

import { Task } from '../task';

const id = x => x;

describe(`task monad`, () => {
  const body = x => x.body;
  const url = 'https://jsonplaceholder.typicode.com/users/1/todos'
  it(`should not eval until fork is called`, () => {
    const t1 = Task((rej, res) => res(1))
      .map(one => one + 2)
      .map(three => three * 2)
      .chain(six => Task((rej, res) => res(six + 1)));

    t1.fork(console.error, x => {
      expect(x).toBe(7)
    })
  });
  describe(`used with a fn expecting an async callback`, () => {
    it(`should handle the payload in the fork functions's resolve fn (the second arg to .fork)`, () => {
      Task((reject, resolve) => request(url, (err, data) => err ? reject(err) : resolve(data)))
        .map(body)
        .fork(console.error, x => expect(x).toBeTruthy())
    });
  });
  describe(`used with a promise fn`, () => {
    describe(`that calls a bad url`, () => {
      it(`should handle the error in the rejected handler`, () => {
        Task.fromPromised(x => superagent.get(x))('http://stop.com')
          .fork(
            e => expect(e).toBe('RequestError: getaddrinfo ENOTFOUND stop.com stop.com:80'),
            id
          )
      });
    });
  });
});

writing tests
=============

Server tests are written just like browser tests, they are just executed differently.

  - place tests near the code they test, in `__tests__` directories throughout
    the server directory
  - Use the same bdd-style `describe()` and `it()` api to define the suites
    and cases of your tests.

    ```js
    describe('some portion of your code', function () {
      it('should do this thing', function () {
        expect(true).to.be(false);
      });
    });
    ```


running the tests
=================

Running the server tests is simple, just execute `npm run test:server` in your terminal
and all of the tests in your server will be run.


focus on the task at hand
=========================

To limit the tests that run add `.only` to your `describe()` or `it()` calls:

```js
describe.only('suite name', function () {
  // ...
});
```

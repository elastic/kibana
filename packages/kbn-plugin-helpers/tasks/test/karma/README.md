writing tests
=============

Browser tests are written just like server tests, they are just executed differently.

  - place tests near the code they test, in `__tests__` directories throughout
    the public directory

  - Use the same bdd-style `describe()` and `it()`
    api to define the suites and cases of your tests.

    ```js
    describe('some portion of your code', function () {
      it('should do this thing', function () {
        expect(true).to.be(false);
      });
    });
    ```


starting the test runner
========================

Under the covers this command uses the `test:karma` task from kibana. This will execute
your tasks once and exit when complete.

When run with the `--dev` option, the command uses the `test:karma:debug` task from kibana.
This task sets-up a test runner that will watch your code for changes and rebuild your
tests when necessary. You access the test runner through a browser that it starts itself
(via Karma).

If your plugin consists of a number of internal plugins, you may wish to keep the tests
isolated to a specific plugin or plugins, instead of executing all of the tests. To do this,
use `--plugins` and passing the plugins you would like to test. Multiple plugins can be
specified by separating them with commas.


running the tests
=================

Once the test runner has started you a new browser window should be opened and you should
see a message saying "connected". Next to that is a "DEBUG" button. This button will open
an interactive version of your tests that you can refresh, inspects, and otherwise debug
while you write your tests.


focus on the task at hand
=========================

To limit the tests that run you can either:

  1. use the ?grep= query string to filter the test cases/suites by name
  2. Click the suite title or (play) button next to test output
  3. Add `.only` to your `describe()` or `it()` calls:

    ```js
    describe.only('suite name', function () {
      // ...
    });
    ```

## Making contributions
When submitting your pull requests, please do the following to make it easier to incorporate your changes:

* Include unit and/or functional tests that validate changes you're making.
* Run unit tests in the latest IE, Firefox, Chrome, Safari and Opera and make sure they pass.
* Rebase your changes onto origin/HEAD if you can do so cleanly.
* If submitting additional functionality, provide an example of how to use it.
* Please keep code style consistent with surrounding code.

## Testing
There are a few ways to run tests:

* You can run tests in PhantomJS by simply running `gradlew test` from your favorite shell.
* Run tests with JSTestDriver using `gradlew jstd`
* Point any browser to `≤project dir>/test/TestStacktrace.html` for unit tests
* Point your browser to `≤project dir>/test/functional/index.html` for more real-world functional tests

module.exports = function getFailedTestsFromMochaRunner(runner) {
  var fails = [];
  var suiteStack = [];

  (function recurse(suite) {
    suiteStack.push(suite);
    (suite.tests || [])
    .filter(function (test) {
        return test.state && test.state !== 'passed' && test.state !== 'pending';
      })
      .forEach(function (test) {
        fails.push({
          title: suiteStack.concat(test).reduce(function (title, suite) {
            if (suite.title) {
              return (title ? title + ' ' : '') + suite.title;
            } else {
              return title;
            }
          }, ''),
          err: test.err ? (test.err.stack || test.err.message) : 'unknown error'
        });
      });
    (suite.suites || []).forEach(recurse);
    suiteStack.pop();
  }(runner.suite));

  return fails;
};

/**
 *  Run the tests that have already been loaded into
 *  mocha. aborts tests on 'cleanup' lifecycle runs
 *
 *  @param  {Lifecycle} lifecycle
 *  @param  {ToolingLog} log
 *  @param  {Mocha} mocha
 *  @return {Promise<Number>} resolves to the number of test failures
 */
export async function runTests(lifecycle, log, mocha) {
  let runComplete = false;
  const runner = mocha.run(() => {
    runComplete = true;
  });

  lifecycle.on('cleanup', () => {
    if (!runComplete) runner.abort();
  });

  return new Promise((resolve) => {
    const respond = () => resolve(runner.failures);

    // if there are no tests, mocha.run() is sync
    // and the 'end' event can't be listened to
    if (runComplete) {
      respond();
    } else {
      runner.on('end', respond);
    }
  });
}

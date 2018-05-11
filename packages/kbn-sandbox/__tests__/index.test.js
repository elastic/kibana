const path = require('path');
const { fork } = require('child_process');

// we have to spawn a process to actually run the test, or else we end up locking
// down the test runner process and not letting us spawn anything in sunsequent tests
test('sandboxes', async (done) => {
  const cp = fork(path.resolve(__dirname, 'test_process.js'));

  cp.on('close', exitCode => {
    expect(exitCode).toBe(0);
    done();
  });
});


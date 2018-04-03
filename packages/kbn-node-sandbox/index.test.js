const assert = require('assert');
const sandbox = require('./index.js');
const { exec } = require('child_process');

function tryExec() {
  // child_process.spawn() throws an exception immediately if it fails.
  // so there's no need to bind to the 'error' event.
  exec('true');
}

if (process.platform === 'win32' || process.platform === 'linux') {
  test(`${process.platform} activates sandbox`, () => {
    assert.doesNotThrow(tryExec);

    const result = sandbox.activate();
    assert.ok(result.success, 'Sandbox failed to activate: ' + result.message);

    // EACCES on Linux, UNKNOWN on Windows.
    assert.throws(tryExec, /Error: spawn (EACCES|UNKNOWN)/);
  });
}

if (process.platform === 'darwin') {
  test('darwin', () => {
    assert.doesNotThrow(tryExec);

    const result = sandbox.activate();
    assert.ok(result.success === false, 'Sandbox activated');

    // EACCES on Linux, UNKNOWN on Windows.
    assert.doesNotThrow(tryExec);
  });
}


const assert = require('assert');
const sandbox = require('./index.js');
const { exec } = require('child_process');

function tryExec() {
  // child_process.exec() throws an exception immediately if it fails.
  // so there's no need to bind to the 'error' event.
  exec('true');
}

if (process.arch !== 'x64') {
  // sandbox only works for x64, no 32-bit or ARM support
  assert.doesNotThrow(tryExec);

  const result = sandbox.activate();
  assert.ok(result.success === false, 'Sandbox activated');

  assert.doesNotThrow(tryExec);
} else {
  // we sandbox in windows and linux
  if (process.platform === 'win32' || process.platform === 'linux') {
    assert.doesNotThrow(tryExec);

    const result = sandbox.activate();
    assert.ok(result.success, 'Sandbox failed to activate: ' + result.message);

    // EACCES on Linux, UNKNOWN on Windows.
    assert.throws(tryExec, /Error: spawn (EACCES|UNKNOWN)/);
  }

  // no os x support at the moment
  if (process.platform === 'darwin') {
    assert.doesNotThrow(tryExec);

    const result = sandbox.activate();
    assert.ok(result.success === false, 'Sandbox activated');

    assert.doesNotThrow(tryExec);
  }
}

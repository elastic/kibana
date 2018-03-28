'use strict';
const assert = require('assert');
const sandbox = require("./index.js");
const child_process = require("child_process");

function tryExec() {
  // child_process.spawn() throws an exception immediately if it fails.
  // so there's no need to bind to the 'error' event.
  child_process.exec("true");
}

assert.doesNotThrow(tryExec);

let s = sandbox.activate()
assert.ok(s.success, "Sandbox failed to activate: " + s.message);

// EACCES on Linux, UNKNOWN on Windows.
assert.throws(tryExec, /Error: spawn (EACCES|UNKNOWN)/);

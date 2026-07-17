/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// We must disable prototype hardening to test the pollution
process.env.KBN_UNSAFE_DISABLE_PROTOTYPE_HARDENING = 'true';

require('@kbn/setup-node-env');

const cp = require('child_process');
const path = require('path');
const test = require('node:test');
const { after } = require('node:test');

Object.prototype.POLLUTED = 'polluted!'; // eslint-disable-line no-extend-native

const notSet = [null, undefined];

after(() => {
  delete Object.prototype.POLLUTED;
});

test('test setup ok', (t) => {
  t.assert.strictEqual({}.POLLUTED, 'polluted!');
});

const functions = ['exec', 'execFile', 'fork', 'spawn', 'execFileSync', 'execSync', 'spawnSync'];
for (const name of functions) {
  test(`${name}()`, (t) => {
    t.assert.throws(() => cp[name](), /argument must be of type string/);
  });
}

{
  const command = 'echo $POLLUTED$custom';

  test('exec(command)', (t) => {
    return assertProcess(t, cp.exec(command));
  });

  test('exec(command, callback)', (t) => {
    return new Promise((resolve) => {
      cp.exec(command, (err, stdout, stderr) => {
        t.assert.ifError(err);
        t.assert.strictEqual(stdout.trim(), '');
        t.assert.strictEqual(stderr.trim(), '');
        resolve();
      });
    });
  });

  test('exec(command, options)', (t) => {
    return assertProcess(t, cp.exec(command, {}));
  });

  test('exec(command, options) - with custom env', (t) => {
    return assertProcess(t, cp.exec(command, { env: { custom: 'custom' } }), { stdout: 'custom' });
  });

  test('exec(command, options, callback)', (t) => {
    return new Promise((resolve) => {
      cp.exec(command, {}, (err, stdout, stderr) => {
        t.assert.ifError(err);
        t.assert.strictEqual(stdout.trim(), '');
        t.assert.strictEqual(stderr.trim(), '');
        resolve();
      });
    });
  });

  test('exec(command, options, callback) - with custom env', (t) => {
    return new Promise((resolve) => {
      cp.exec(command, { env: { custom: 'custom' } }, (err, stdout, stderr) => {
        t.assert.ifError(err);
        t.assert.strictEqual(stdout.trim(), 'custom');
        t.assert.strictEqual(stderr.trim(), '');
        resolve();
      });
    });
  });

  for (const unset of notSet) {
    test(`exec(command, ${unset})`, (t) => {
      return assertProcess(t, cp.exec(command, unset));
    });

    test(`exec(command, ${unset}, callback)`, (t) => {
      return new Promise((resolve) => {
        cp.exec(command, unset, (err, stdout, stderr) => {
          t.assert.ifError(err);
          t.assert.strictEqual(stdout.trim(), '');
          t.assert.strictEqual(stderr.trim(), '');
          resolve();
        });
      });
    });
  }
}

{
  const file = path.join(__dirname, '_echo.sh');

  test('execFile(file)', (t) => {
    return assertProcess(t, cp.execFile(file));
  });

  test('execFile(file, args)', (t) => {
    return assertProcess(t, cp.execFile(file, []));
  });

  test('execFile(file, callback)', (t) => {
    return new Promise((resolve) => {
      cp.execFile(file, (err, stdout, stderr) => {
        t.assert.ifError(err);
        t.assert.strictEqual(stdout.trim(), '');
        t.assert.strictEqual(stderr.trim(), '');
        resolve();
      });
    });
  });

  test('execFile(file, options)', (t) => {
    return assertProcess(t, cp.execFile(file, {}));
  });

  test('execFile(file, options) - with custom env', (t) => {
    return assertProcess(t, cp.execFile(file, { env: { custom: 'custom' } }), { stdout: 'custom' });
  });

  test('execFile(file, options, callback)', (t) => {
    return new Promise((resolve) => {
      cp.execFile(file, {}, (err, stdout, stderr) => {
        t.assert.ifError(err);
        t.assert.strictEqual(stdout.trim(), '');
        t.assert.strictEqual(stderr.trim(), '');
        resolve();
      });
    });
  });

  test('execFile(file, options, callback) - with custom env', (t) => {
    return new Promise((resolve) => {
      cp.execFile(file, { env: { custom: 'custom' } }, (err, stdout, stderr) => {
        t.assert.ifError(err);
        t.assert.strictEqual(stdout.trim(), 'custom');
        t.assert.strictEqual(stderr.trim(), '');
        resolve();
      });
    });
  });

  test('execFile(file, args, callback)', (t) => {
    return new Promise((resolve) => {
      cp.execFile(file, [], (err, stdout, stderr) => {
        t.assert.ifError(err);
        t.assert.strictEqual(stdout.trim(), '');
        t.assert.strictEqual(stderr.trim(), '');
        resolve();
      });
    });
  });

  test('execFile(file, args, options)', (t) => {
    return assertProcess(t, cp.execFile(file, [], {}));
  });

  test('execFile(file, args, options) - with custom env', (t) => {
    return assertProcess(t, cp.execFile(file, [], { env: { custom: 'custom' } }), {
      stdout: 'custom',
    });
  });

  test('execFile(file, args, options, callback)', (t) => {
    return new Promise((resolve) => {
      cp.execFile(file, [], {}, (err, stdout, stderr) => {
        t.assert.ifError(err);
        t.assert.strictEqual(stdout.trim(), '');
        t.assert.strictEqual(stderr.trim(), '');
        resolve();
      });
    });
  });

  test('execFile(file, args, options, callback) - with custom env', (t) => {
    return new Promise((resolve) => {
      cp.execFile(file, [], { env: { custom: 'custom' } }, (err, stdout, stderr) => {
        t.assert.ifError(err);
        t.assert.strictEqual(stdout.trim(), 'custom');
        t.assert.strictEqual(stderr.trim(), '');
        resolve();
      });
    });
  });

  for (const unset of notSet) {
    test(`execFile(file, ${unset})`, (t) => {
      return assertProcess(t, cp.execFile(file, unset));
    });

    test(`execFile(file, ${unset}, ${unset})`, (t) => {
      return assertProcess(t, cp.execFile(file, unset, unset));
    });

    test(`execFile(file, ${unset}, callback)`, (t) => {
      return new Promise((resolve) => {
        cp.execFile(file, unset, (err, stdout, stderr) => {
          t.assert.ifError(err);
          t.assert.strictEqual(stdout.trim(), '');
          t.assert.strictEqual(stderr.trim(), '');
          resolve();
        });
      });
    });

    test(`execFile(file, ${unset}, ${unset}, callback)`, (t) => {
      return new Promise((resolve) => {
        cp.execFile(file, unset, unset, (err, stdout, stderr) => {
          t.assert.ifError(err);
          t.assert.strictEqual(stdout.trim(), '');
          t.assert.strictEqual(stderr.trim(), '');
          resolve();
        });
      });
    });

    test(`execFile(file, ${unset}, options)`, (t) => {
      return assertProcess(t, cp.execFile(file, unset, {}));
    });
  }
}

{
  const modulePath = path.join(__dirname, '_fork.js');

  // NOTE: Forked processes don't have any stdout we can monitor without providing options
  test.skip('fork(modulePath)', (t) => {
    return assertProcess(t, cp.fork(modulePath));
  });

  // NOTE: Forked processes don't have any stdout we can monitor without providing options
  test.skip('execFile(file, args)', (t) => {
    return assertProcess(t, cp.fork(modulePath, []));
  });

  test('fork(modulePath, options)', (t) => {
    return assertProcess(
      t,
      cp.fork(modulePath, {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      })
    );
  });

  test('fork(modulePath, options) - with custom env', (t) => {
    return assertProcess(
      t,
      cp.fork(modulePath, {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: { custom: 'custom' },
      }),
      { stdout: 'custom' }
    );
  });

  test('fork(modulePath, args, options)', (t) => {
    return assertProcess(
      t,
      cp.fork(modulePath, [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      })
    );
  });

  test('fork(modulePath, args, options) - with custom env', (t) => {
    return assertProcess(
      t,
      cp.fork(modulePath, [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: { custom: 'custom' },
      }),
      { stdout: 'custom' }
    );
  });

  for (const unset of notSet) {
    // NOTE: Forked processes don't have any stdout we can monitor without providing options
    test.skip(`fork(modulePath, ${unset})`, (t) => {
      return assertProcess(t, cp.fork(modulePath, unset));
    });

    // NOTE: Forked processes don't have any stdout we can monitor without providing options
    test.skip(`fork(modulePath, ${unset}, ${unset})`, (t) => {
      return assertProcess(t, cp.fork(modulePath, unset, unset));
    });

    test(`fork(modulePath, ${unset}, options)`, (t) => {
      return assertProcess(
        t,
        cp.fork(modulePath, unset, {
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        })
      );
    });
  }
}

{
  const command = path.join(__dirname, '_echo.sh');

  test('spawn(command)', (t) => {
    return assertProcess(t, cp.spawn(command));
  });

  test('spawn(command, args)', (t) => {
    return assertProcess(t, cp.spawn(command, []));
  });

  test('spawn(command, options)', (t) => {
    return assertProcess(t, cp.spawn(command, {}));
  });

  test('spawn(command, options) - with custom env', (t) => {
    return assertProcess(t, cp.spawn(command, { env: { custom: 'custom' } }), { stdout: 'custom' });
  });

  test('spawn(command, args, options)', (t) => {
    return assertProcess(t, cp.spawn(command, [], {}));
  });

  test('spawn(command, args, options) - with custom env', (t) => {
    return assertProcess(t, cp.spawn(command, [], { env: { custom: 'custom' } }), {
      stdout: 'custom',
    });
  });

  test('spawn(command, options) - prevent object prototype pollution', (t) => {
    const pathName = path.join(__dirname, '_node_script.js');
    const options = {};
    const pollutedObject = {
      env: {
        NODE_OPTIONS: `--require ${pathName}`,
      },
      shell: process.argv[0],
    };
    // eslint-disable-next-line no-proto
    options.__proto__['2'] = pollutedObject;

    const argsArray = [];

    /**
     * Declares that 3 assertions should be run.
     * We don't use the assertProcess function here as we need an extra assertion
     * for the polluted prototype
     */
    t.plan(3);

    return new Promise((resolve) => {
      t.assert.deepStrictEqual(
        argsArray[2],
        pollutedObject,
        'Prototype should be polluted with the object at index 2'
      );

      const stdout = '';

      const cmd = cp.spawn(command, argsArray);
      cmd.stdout.on('data', (data) => {
        t.assert.strictEqual(data.toString().trim(), stdout);
      });

      cmd.stderr.on('data', (data) => {
        t.assert.fail(`Unexpected data on STDERR: "${data}"`);
      });

      cmd.on('close', (code) => {
        t.assert.strictEqual(code, 0);
        resolve();
      });
    });
  });

  for (const unset of notSet) {
    test(`spawn(command, ${unset})`, (t) => {
      return assertProcess(t, cp.spawn(command, unset));
    });

    test(`spawn(command, ${unset}, ${unset})`, (t) => {
      return assertProcess(t, cp.spawn(command, unset, unset));
    });

    test(`spawn(command, ${unset}, options)`, (t) => {
      return assertProcess(t, cp.spawn(command, unset, {}));
    });
  }
}

{
  const file = path.join(__dirname, '_echo.sh');

  test('execFileSync(file)', (t) => {
    t.assert.strictEqual(cp.execFileSync(file).toString().trim(), '');
  });

  test('execFileSync(file, args)', (t) => {
    t.assert.strictEqual(cp.execFileSync(file, []).toString().trim(), '');
  });

  test('execFileSync(file, options)', (t) => {
    t.assert.strictEqual(cp.execFileSync(file, {}).toString().trim(), '');
  });

  test('execFileSync(file, options) - with custom env', (t) => {
    t.assert.strictEqual(
      cp
        .execFileSync(file, { env: { custom: 'custom' } })
        .toString()
        .trim(),
      'custom'
    );
  });

  test('execFileSync(file, args, options)', (t) => {
    t.assert.strictEqual(cp.execFileSync(file, [], {}).toString().trim(), '');
  });

  test('execFileSync(file, args, options) - with custom env', (t) => {
    t.assert.strictEqual(
      cp
        .execFileSync(file, [], { env: { custom: 'custom' } })
        .toString()
        .trim(),
      'custom'
    );
  });

  for (const unset of notSet) {
    test(`execFileSync(file, ${unset})`, (t) => {
      t.assert.strictEqual(cp.execFileSync(file, unset).toString().trim(), '');
    });

    test(`execFileSync(file, ${unset}, ${unset})`, (t) => {
      t.assert.strictEqual(cp.execFileSync(file, unset, unset).toString().trim(), '');
    });

    test(`execFileSync(file, ${unset}, options)`, (t) => {
      t.assert.strictEqual(cp.execFileSync(file, unset, {}).toString().trim(), '');
    });
  }
}

{
  const command = 'echo $POLLUTED$custom';

  test('execSync(command)', (t) => {
    t.assert.strictEqual(cp.execSync(command).toString().trim(), '');
  });

  test('execSync(command, options)', (t) => {
    t.assert.strictEqual(cp.execSync(command, {}).toString().trim(), '');
  });

  test('execSync(command, options) - with custom env', (t) => {
    t.assert.strictEqual(
      cp
        .execSync(command, { env: { custom: 'custom' } })
        .toString()
        .trim(),
      'custom'
    );
  });

  for (const unset of notSet) {
    test(`execSync(command, ${unset})`, (t) => {
      t.assert.strictEqual(cp.execSync(command, unset).toString().trim(), '');
    });
  }
}

{
  const command = path.join(__dirname, '_echo.sh');

  test('spawnSync(command)', (t) => {
    const result = cp.spawnSync(command);
    t.assert.ifError(result.error);
    t.assert.strictEqual(result.stdout.toString().trim(), '');
    t.assert.strictEqual(result.stderr.toString().trim(), '');
  });

  test('spawnSync(command, args)', (t) => {
    const result = cp.spawnSync(command, []);
    t.assert.ifError(result.error);
    t.assert.strictEqual(result.stdout.toString().trim(), '');
    t.assert.strictEqual(result.stderr.toString().trim(), '');
  });

  test('spawnSync(command, options)', (t) => {
    const result = cp.spawnSync(command, {});
    t.assert.ifError(result.error);
    t.assert.strictEqual(result.stdout.toString().trim(), '');
    t.assert.strictEqual(result.stderr.toString().trim(), '');
  });

  test('spawnSync(command, options) - with custom env', (t) => {
    const result = cp.spawnSync(command, { env: { custom: 'custom' } });
    t.assert.ifError(result.error);
    t.assert.strictEqual(result.stdout.toString().trim(), 'custom');
    t.assert.strictEqual(result.stderr.toString().trim(), '');
  });

  test('spawnSync(command, args, options)', (t) => {
    const result = cp.spawnSync(command, [], {});
    t.assert.ifError(result.error);
    t.assert.strictEqual(result.stdout.toString().trim(), '');
    t.assert.strictEqual(result.stderr.toString().trim(), '');
  });

  test('spawnSync(command, args, options) - with custom env', (t) => {
    const result = cp.spawnSync(command, [], { env: { custom: 'custom' } });
    t.assert.ifError(result.error);
    t.assert.strictEqual(result.stdout.toString().trim(), 'custom');
    t.assert.strictEqual(result.stderr.toString().trim(), '');
  });

  for (const unset of notSet) {
    test(`spawnSync(command, ${unset})`, (t) => {
      const result = cp.spawnSync(command, unset);
      t.assert.ifError(result.error);
      t.assert.strictEqual(result.stdout.toString().trim(), '');
      t.assert.strictEqual(result.stderr.toString().trim(), '');
    });

    test(`spawnSync(command, ${unset}, ${unset})`, (t) => {
      const result = cp.spawnSync(command, unset, unset);
      t.assert.ifError(result.error);
      t.assert.strictEqual(result.stdout.toString().trim(), '');
      t.assert.strictEqual(result.stderr.toString().trim(), '');
    });

    test(`spawnSync(command, ${unset}, options)`, (t) => {
      const result = cp.spawnSync(command, unset, {});
      t.assert.ifError(result.error);
      t.assert.strictEqual(result.stdout.toString().trim(), '');
      t.assert.strictEqual(result.stderr.toString().trim(), '');
    });
  }
}

function assertProcess(t, cmd, { stdout = '' } = {}) {
  t.plan(2);

  return new Promise((resolve) => {
    cmd.stdout.on('data', (data) => {
      t.assert.strictEqual(data.toString().trim(), stdout);
    });

    cmd.stderr.on('data', (data) => {
      t.assert.fail(`Unexpected data on STDERR: "${data}"`);
    });

    cmd.on('close', (code) => {
      t.assert.strictEqual(code, 0);
      resolve();
    });
  });
}

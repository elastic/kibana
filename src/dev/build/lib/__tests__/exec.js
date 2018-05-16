import { resolve } from 'path';

import expect from 'expect.js';
import sinon from 'sinon';
import stripAnsi from 'strip-ansi';

import { createToolingLog } from '@kbn/dev-utils';
import { exec } from '../exec';

describe('dev/build/lib/exec', () => {
  const sandbox = sinon.sandbox.create();
  afterEach(() => sandbox.reset());

  const log = createToolingLog('verbose');
  const onLogLine = sandbox.stub();
  log.on('data', line => onLogLine(stripAnsi(line)));

  function getWritten() {
    return stripAnsi(onLogLine.args.reduce((acc, [chunk]) => acc + chunk, ''));
  }

  it('executes a command, logs the command, and logs the output', async () => {
    await exec(log, process.execPath, ['-e', 'console.log("foobar")']);

    // logs the command before execution
    expect(getWritten()).to.match(/debg\s+\$ .+bin\/node/);

    // log output of the process
    expect(getWritten()).to.match(/debg\s+foobar/);
  });

  it('logs using level: option', async () => {
    await exec(log, process.execPath, ['-e', 'console.log("foobar")'], {
      level: 'info'
    });

    // logs the command before execution
    expect(getWritten()).to.match(/info\s+\$ .+bin\/node/);

    // log output of the process
    expect(getWritten()).to.match(/info\s+foobar/);
  });

  it('send the proc SIGKILL if it logs a line matching exitAfter regexp', async function () {
    // fixture proc will exit after 10 seconds if sigint not received, but the test won't fail
    // unless we see the log line `SIGINT not received`, so we let the test take up to 30 seconds
    // for potentially huge delays here and there
    this.timeout(30000);

    await exec(log, process.execPath, [require.resolve('./fixtures/log_on_sigint')], {
      exitAfter: /listening for SIGINT/
    });

    sinon.assert.calledWithExactly(onLogLine, sinon.match(/listening for SIGINT/));
    sinon.assert.neverCalledWith(onLogLine, sinon.match(/SIGINT not received/));
  });

  it('logs using level: option', async () => {
    const parentDir = resolve(process.cwd(), '..');

    await exec(log, process.execPath, ['-e', 'console.log(process.cwd())'], {
      level: 'info',
      cwd: parentDir,
    });

    // log output of the process, checking for \n to ensure cwd() doesn't log
    // the subdir that this process is executing in
    sinon.assert.calledWithExactly(onLogLine, sinon.match(parentDir + '\n'));
  });
});

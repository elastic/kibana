import { resolve } from 'path';

import sinon from 'sinon';
import stripAnsi from 'strip-ansi';

import { createToolingLog } from '@kbn/dev-utils';
import { exec } from '../exec';

describe('dev/build/lib/exec', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => sandbox.reset());

  const log = createToolingLog('verbose');
  const onLogLine = sandbox.stub();
  log.on('data', line => onLogLine(stripAnsi(line)));

  it('executes a command, logs the command, and logs the output', async () => {
    await exec(log, process.execPath, ['-e', 'console.log("hi")']);

    // logs the command before execution
    sinon.assert.calledWithExactly(onLogLine, sinon.match(`$ ${process.execPath}`));

    // log output of the process
    sinon.assert.calledWithExactly(onLogLine, sinon.match(/debg\s+hi/));
  });

  it('logs using level: option', async () => {
    await exec(log, process.execPath, ['-e', 'console.log("hi")'], {
      level: 'info'
    });

    // log output of the process
    sinon.assert.calledWithExactly(onLogLine, sinon.match(/info\s+hi/));
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

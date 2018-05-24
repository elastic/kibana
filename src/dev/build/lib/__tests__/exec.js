import sinon from 'sinon';
import stripAnsi from 'strip-ansi';

import { createToolingLog } from '../../../tooling_log';
import { exec } from '../exec';

describe('dev/build/lib/exec', () => {
  const sandbox = sinon.sandbox.create();
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
});
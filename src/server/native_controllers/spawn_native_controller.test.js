import { fork } from 'child_process';
import { spawnNativeController } from './spawn_native_controller';
jest.mock('child_process');

let originalProcessEnv;
let originalProcessExecArgv;
beforeEach(() => {
  fork.mockReset();
  originalProcessEnv = process.env;
  originalProcessExecArgv = process.execArgv;
});
afterEach(() => {
  process.env = originalProcessEnv;
  process.execArgv = originalProcessExecArgv;
});

test(`forks native_controller_start.js with path as argument`, () => {
  const nativeControllerPath = '/foo/bar';
  spawnNativeController(nativeControllerPath);
  expect(fork).toHaveBeenCalledTimes(1);
  expect(fork).toHaveBeenCalledWith(require.resolve('./native_controller_start.js'), [nativeControllerPath], expect.anything());
});

[
  `--debug-port`,
  `--debug-port=9222`,
  `--inspect`,
  `--inspect-brk`,
  `--inspect-port`,
  `--inspect-port=9222`
].forEach(commandLineArgument => {
  test(`when parent process is started with ${commandLineArgument} command line argument we specify the inspectPort`, () => {
    process.execArgv = [commandLineArgument];
    spawnNativeController();
    expect(fork).toHaveBeenCalledTimes(1);
    expect(fork).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      execArgv: [commandLineArgument, expect.stringMatching(/^--inspect-port=\d+/)]
    });
  });
});

[
  `--debug-port`,
  `--debug-port=9222`,
  `--inspect`,
  `--inspect-brk`,
  `--inspect-port`,
  `--inspect-port=9222`
].forEach(commandLineArgument => {
  test(`when parent process is started with NODE_OPTIONS=${commandLineArgument} we specify the inspectPort`, () => {
    process.env = {
      NODE_OPTIONS: commandLineArgument
    };
    process.execArgv = [];
    spawnNativeController();
    expect(fork).toHaveBeenCalledTimes(1);
    expect(fork).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
      execArgv: [expect.stringMatching(/^--inspect-port=\d+/)]
    });
  });
});

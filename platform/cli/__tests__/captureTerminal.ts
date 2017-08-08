export function captureTerminal<T extends string[]>(
  fn: (argv: T) => any,
  argv: T
) {
  let mockProcessExit = jest
    .spyOn(global.process, 'exit')
    .mockImplementation(() => {});
  let mockProcessEmit = jest
    .spyOn(global.process, 'emit')
    .mockImplementation(() => {});

  let mockConsoleLog = jest
    .spyOn(global.console, 'log')
    .mockImplementation(() => {});
  let mockConsoleWarn = jest
    .spyOn(global.console, 'warn')
    .mockImplementation(() => {});
  let mockConsoleError = jest
    .spyOn(global.console, 'error')
    .mockImplementation(() => {});

  const _env = process.env;
  const _argv = process.argv;

  process.env = {
    ...process.env,
    _: 'node'
  };

  process.argv = argv;

  const result: T = fn(argv);

  try {
    return {
      errors: mockConsoleError.mock.calls,
      logs: mockConsoleLog.mock.calls,
      warnings: mockConsoleWarn.mock.calls,
      exit: mockProcessExit.mock.calls.length > 0,
      result
    };
  } finally {
    mockProcessExit.mockReset();
    mockProcessEmit.mockReset();
    mockConsoleLog.mockReset();
    mockConsoleWarn.mockReset();
    mockConsoleError.mockReset();

    process.env = _env;
    process.argv = _argv;
  }
}

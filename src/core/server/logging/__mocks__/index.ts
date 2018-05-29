// Test helpers to simplify mocking logs and collecting all their outputs

const _log = {
  debug: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
  trace: jest.fn(),
  warn: jest.fn(),
};

const _clear = () => {
  logger.get.mockClear();
  _log.debug.mockClear();
  _log.info.mockClear();
  _log.warn.mockClear();
  _log.error.mockClear();
  _log.trace.mockClear();
  _log.fatal.mockClear();
  _log.log.mockClear();
};

const _collect = () => ({
  debug: _log.debug.mock.calls,
  error: _log.error.mock.calls,
  fatal: _log.fatal.mock.calls,
  info: _log.info.mock.calls,
  log: _log.log.mock.calls,
  trace: _log.trace.mock.calls,
  warn: _log.warn.mock.calls,
});

export const logger = {
  _clear,
  _collect,
  _log,
  get: jest.fn(() => _log),
};

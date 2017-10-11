// Test helpers to simplify mocking logs and collecting all their outputs

const _log = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  trace: jest.fn(),
  fatal: jest.fn(),
  log: jest.fn()
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
  info: _log.info.mock.calls,
  warn: _log.warn.mock.calls,
  error: _log.error.mock.calls,
  trace: _log.trace.mock.calls,
  fatal: _log.fatal.mock.calls,
  log: _log.log.mock.calls
});

export const logger = {
  get: jest.fn(() => _log),
  _log,
  _collect,
  _clear
};

const _log = {
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
};

const _clear = () => {
  logger.get.mockClear();
  _log.debug.mockClear();
  _log.info.mockClear();
  _log.error.mockClear();
}

const _collect = () => ({
  debug: _log.debug.mock.calls,
  info: _log.info.mock.calls,
  error: _log.error.mock.calls
});

export const logger = {
  get: jest.fn(() => _log),
  _log,
  _collect,
  _clear
};
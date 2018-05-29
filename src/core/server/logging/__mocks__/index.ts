// Test helpers to simplify mocking logs and collecting all their outputs

const mockLog = {
  debug: jest.fn(),
  error: jest.fn(),
  fatal: jest.fn(),
  info: jest.fn(),
  log: jest.fn(),
  trace: jest.fn(),
  warn: jest.fn(),
};

const mockClear = () => {
  logger.get.mockClear();
  mockLog.debug.mockClear();
  mockLog.info.mockClear();
  mockLog.warn.mockClear();
  mockLog.error.mockClear();
  mockLog.trace.mockClear();
  mockLog.fatal.mockClear();
  mockLog.log.mockClear();
};

const mockCollect = () => ({
  debug: mockLog.debug.mock.calls,
  error: mockLog.error.mock.calls,
  fatal: mockLog.fatal.mock.calls,
  info: mockLog.info.mock.calls,
  log: mockLog.log.mock.calls,
  trace: mockLog.trace.mock.calls,
  warn: mockLog.warn.mock.calls,
});

export const logger = {
  get: jest.fn(() => mockLog),
  mockClear,
  mockCollect,
  mockLog,
};

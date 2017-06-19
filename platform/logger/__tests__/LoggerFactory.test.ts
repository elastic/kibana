const mockLoggerAdapter = jest.fn();

jest.mock('../LoggerAdapter', () => ({
  LoggerAdapter: mockLoggerAdapter
}))

import { MutableLoggerFactory } from '../LoggerFactory';

test('returns instance of logger adapter at namespace', () => {
  const factory = new MutableLoggerFactory();

  const logger = factory.get('my', 'namespace');

  expect(mockLoggerAdapter.mock.instances.length).toBe(1);
  expect(mockLoggerAdapter.mock.instances[0]).toBe(logger);
});

test('returns same instance every time at namespace', () => {
  const factory = new MutableLoggerFactory();

  const logger = factory.get('my', 'namespace');
  const logger2 = factory.get('my', 'namespace');

  expect(logger).toBe(logger2);
});

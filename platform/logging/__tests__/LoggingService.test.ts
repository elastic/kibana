import { BehaviorSubject } from '@elastic/kbn-observable';
import { MutableLoggerFactory } from '../LoggerFactory';
import { LoggingConfig } from '../LoggingConfig';
import { LoggingService } from '../LoggingService';

const createConfig = () => {
  return new LoggingConfig({
    appenders: new Map(),
    loggers: [],
    root: {
      appenders: ['default'],
      level: 'info'
    }
  });
};

const getLastMockCallArgs = (mockFunction: jest.Mock<Function>) => {
  expect(mockFunction).toHaveBeenCalled();
  return mockFunction.mock.calls[mockFunction.mock.calls.length - 1];
};

let factory: MutableLoggerFactory;
let service: LoggingService;
let updateConfigMock: jest.Mock<Function>;
let closeMock: jest.Mock<Function>;
beforeEach(() => {
  factory = new MutableLoggerFactory({} as any);
  updateConfigMock = jest
    .spyOn(factory, 'updateConfig')
    .mockImplementation(() => {});
  closeMock = jest.spyOn(factory, 'close').mockImplementation(() => {});

  service = new LoggingService(factory);
});

test('`upgrade()` updates logging factory config.', () => {
  expect(factory.updateConfig).not.toHaveBeenCalled();

  const config = createConfig();
  const config$ = new BehaviorSubject<LoggingConfig>(config);

  service.upgrade(config$.asObservable());

  expect(updateConfigMock).toHaveBeenCalledTimes(1);
  expect(getLastMockCallArgs(updateConfigMock)[0]).toBe(config);

  const newConfig = createConfig();
  config$.next(newConfig);
  expect(updateConfigMock).toHaveBeenCalledTimes(2);
  expect(getLastMockCallArgs(updateConfigMock)[0]).toBe(newConfig);
});

test('`stop()` closes logger factory and stops config updates.', async () => {
  const config$ = new BehaviorSubject<LoggingConfig>(createConfig());

  service.upgrade(config$.asObservable());
  updateConfigMock.mockReset();

  await service.stop();

  expect(factory.close).toHaveBeenCalled();

  config$.next(createConfig());
  expect(updateConfigMock).not.toHaveBeenCalled();
});

import { BehaviorSubject } from 'rxjs';
import { LogLevelId } from '../LogLevel';
import { MutableLoggerFactory } from '../LoggerFactory';
import { LoggingConfig } from '../LoggingConfig';
import { LoggingService } from '../LoggingService';

const createRandomConfig = (appenderKey: string) => {
  return new LoggingConfig({
    appenders: new Map([
      [
        appenderKey,
        { kind: 'console', layout: { kind: 'pattern', highlight: false } }
      ]
    ]),
    loggers: new Map([
      ['random', { appenders: [appenderKey], level: 'info' as LogLevelId }]
    ])
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
  factory = new MutableLoggerFactory();
  updateConfigMock = jest
    .spyOn(factory, 'updateConfig')
    .mockImplementation(() => {});
  closeMock = jest.spyOn(factory, 'close').mockImplementation(() => {});

  service = new LoggingService(factory);
});

test('`upgrade()` updates logging factory config.', () => {
  expect(factory.updateConfig).not.toHaveBeenCalled();

  const config = createRandomConfig('old');
  const config$ = new BehaviorSubject<LoggingConfig>(config);

  service.upgrade(config$);

  expect(updateConfigMock).toHaveBeenCalledTimes(1);
  expect(getLastMockCallArgs(updateConfigMock)[0]).toBe(config);

  const newConfig = createRandomConfig('new');
  config$.next(newConfig);
  expect(factory.updateConfig).toHaveBeenCalledTimes(2);
  expect(getLastMockCallArgs(updateConfigMock)[0]).toBe(newConfig);
});

test('`stop()` closes logger factory and stops config updates.', async () => {
  const config = createRandomConfig('old');
  const config$ = new BehaviorSubject<LoggingConfig>(config);

  service.upgrade(config$);

  expect(factory.updateConfig).toHaveBeenCalledTimes(1);
  expect(getLastMockCallArgs(updateConfigMock)[0]).toBe(config);

  await service.stop();

  expect(factory.close).toHaveBeenCalled();

  const newConfig = createRandomConfig('new');
  config$.next(newConfig);
  expect(factory.updateConfig).toHaveBeenCalledTimes(1);
  expect(getLastMockCallArgs(updateConfigMock)[0]).not.toBe(newConfig);
});

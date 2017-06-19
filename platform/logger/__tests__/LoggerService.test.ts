import { BehaviorSubject } from 'rxjs';

import { LoggerService } from '../LoggerService';
import { MutableLogger } from '../LoggerFactory';
import { LoggerConfig } from '../LoggerConfig';

const config = new LoggerConfig({
  dest: 'test',
  silent: false,
  quiet: false,
  verbose: false
});

const config2 = new LoggerConfig({
  dest: 'test2',
  silent: true,
  quiet: false,
  verbose: false
});

test('updates mutable logger when receiving new logger configs', () => {
  const mutableLogger: MutableLogger = {
    updateLogger: jest.fn(),
    close: jest.fn()
  }

  const config$ = new BehaviorSubject(config);

  const loggerService = new LoggerService(mutableLogger);

  loggerService.upgrade(config$.asObservable());

  expect(mutableLogger.updateLogger).toHaveBeenCalledTimes(1);
  expect(mutableLogger.updateLogger).toHaveBeenLastCalledWith(config);

  config$.next(config2);

  expect(mutableLogger.updateLogger).toHaveBeenCalledTimes(2);
  expect(mutableLogger.updateLogger).toHaveBeenLastCalledWith(config2);
});

test('closes mutable logger when stopped', () => {
  const mutableLogger: MutableLogger = {
    updateLogger: jest.fn(),
    close: jest.fn()
  }

  const config$ = new BehaviorSubject(config);

  const loggerService = new LoggerService(mutableLogger);

  loggerService.upgrade(config$.asObservable());
  loggerService.stop();

  expect(mutableLogger.close).toHaveBeenCalledTimes(1);
});

test('does not update mutable logger after stopped', () => {
  const mutableLogger: MutableLogger = {
    updateLogger: jest.fn(),
    close: jest.fn()
  }

  const config$ = new BehaviorSubject(config);

  const loggerService = new LoggerService(mutableLogger);

  loggerService.upgrade(config$.asObservable());
  loggerService.stop();

  config$.next(config2);

  expect(mutableLogger.updateLogger).toHaveBeenCalledTimes(1);
});

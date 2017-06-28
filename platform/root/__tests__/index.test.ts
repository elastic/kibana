const loggerConfig = {};

const configService = {
  start: jest.fn(),
  stop: jest.fn(),
  reloadConfig: jest.fn(),
  atPath: jest.fn(() => loggerConfig)
};

const mockConfigService = jest.fn(() => configService);

const server = {
  start: jest.fn(),
  stop: jest.fn()
};
const mockServer = jest.fn(() => server);

const loggerService = {
  upgrade: jest.fn(),
  stop: jest.fn()
};

const logger = {
  get: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn()
  }))
};

const mockMutableLoggerFactory = jest.fn(() => logger);

const mockLoggerService = jest.fn(() => loggerService);

jest.mock('../../config', () => ({ ConfigService: mockConfigService }));
jest.mock('../../server', () => ({ Server: mockServer }));
jest.mock('../../logger', () => ({
  LoggerService: mockLoggerService,
  MutableLoggerFactory: mockMutableLoggerFactory
}));

import { Root } from '../';
import { Env } from '../../config/Env';

let oldExit = process.exit;

beforeEach(() => {
  process.exit = jest.fn();
});

afterEach(() => {
  process.exit = oldExit;
});

test('starts services on "start"', async () => {
  const env = new Env('.');
  const root = new Root({}, env);

  expect(configService.start).toHaveBeenCalledTimes(0);
  expect(loggerService.upgrade).toHaveBeenCalledTimes(0);
  expect(server.start).toHaveBeenCalledTimes(0);

  await root.start();

  expect(configService.start).toHaveBeenCalledTimes(1);
  expect(loggerService.upgrade).toHaveBeenCalledTimes(1);
  expect(loggerService.upgrade).toHaveBeenLastCalledWith(loggerConfig);
  expect(server.start).toHaveBeenCalledTimes(1);
});

test('reloads config', () => {
  const env = new Env('.');
  const root = new Root({}, env);

  expect(configService.reloadConfig).toHaveBeenCalledTimes(0);

  root.reloadConfig();

  expect(configService.reloadConfig).toHaveBeenCalledTimes(1);
});

test('stops services on "shutdown"', async () => {
  const env = new Env('.');
  const root = new Root({}, env);

  await root.start();

  expect(configService.stop).toHaveBeenCalledTimes(0);
  expect(loggerService.stop).toHaveBeenCalledTimes(0);
  expect(server.stop).toHaveBeenCalledTimes(0);

  await root.shutdown();

  expect(configService.stop).toHaveBeenCalledTimes(1);
  expect(loggerService.stop).toHaveBeenCalledTimes(1);
  expect(server.stop).toHaveBeenCalledTimes(1);
});

test('exits process on "shutdown"', async () => {
  const env = new Env('.');
  const root = new Root({}, env);

  await root.start();

  expect(process.exit).toHaveBeenCalledTimes(0);

  await root.shutdown();

  expect(process.exit).toHaveBeenCalledTimes(1);
});
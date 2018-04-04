import path from 'path';
import EventEmitter from 'events';
import * as NativeControllers from './index';
import { NativeController } from './native_controller';
import { spawnNativeController } from './spawn_native_controller';
import { safeChildProcess } from '../../utils/child_process/safe_child_process';
jest.mock('./spawn_native_controller');
jest.mock('../../utils/child_process/safe_child_process');

const FIXTURES = path.resolve(__dirname, '__fixtures__');

let mockSpawnedProcess;
beforeEach(() => {
  spawnNativeController.mockClear();
  mockSpawnedProcess = new EventEmitter();
  spawnNativeController.mockReturnValue(mockSpawnedProcess);
});

describe('#prepare', () => {
  test(`spawns correct native controller`, async () => {
    const kbnServer = {
      settings: {
        plugins: {
          paths: [
            path.resolve(FIXTURES, 'correct')
          ]
        }
      }
    };

    await NativeControllers.prepare(kbnServer);

    expect(spawnNativeController).toHaveBeenCalledTimes(1);
    expect(spawnNativeController).toHaveBeenCalledWith(path.resolve(FIXTURES, 'correct', 'native_controller.js'));
    expect(kbnServer.nativeControllers).toHaveProperty('correct');
    expect(kbnServer.nativeControllers.correct).toBeInstanceOf(NativeController);
  });

  test(`doesn't spawn native controller not specified in the package.json`, async () => {
    const kbnServer = {
      settings: {
        plugins: {
          paths: [
            path.resolve(FIXTURES, 'not_defined_in_package_json')
          ]
        }
      }
    };

    await NativeControllers.prepare(kbnServer);

    expect(spawnNativeController).toHaveBeenCalledTimes(0);
  });

  test(`scans plugin directories`, async () => {
    const kbnServer = {
      settings: {
        plugins: {
          scanDirs: [
            FIXTURES
          ]
        }
      }
    };

    await NativeControllers.prepare(kbnServer);

    expect(spawnNativeController).toHaveBeenCalledTimes(1);
    expect(spawnNativeController).toHaveBeenCalledWith(path.resolve(FIXTURES, 'correct', 'native_controller.js'));
    expect(kbnServer.nativeControllers).toHaveProperty('correct');
    expect(kbnServer.nativeControllers.correct).toBeInstanceOf(NativeController);
  });

  test(`calls safeChildProcess with the nativeController.process`, async () => {
    const kbnServer = {
      settings: {
        plugins: {
          paths: [
            path.resolve(FIXTURES, 'correct')
          ]
        }
      }
    };

    await NativeControllers.prepare(kbnServer);

    expect(safeChildProcess).toHaveBeenCalledWith(mockSpawnedProcess);
  });

  test(`kills process when nativeController.process exits unexpectedly`, async () => {
    const kbnServer = {
      settings: {
        plugins: {
          paths: [
            path.resolve(FIXTURES, 'correct')
          ]
        }
      }
    };
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    safeChildProcess.mockReturnValue({ terminating: false });

    await NativeControllers.prepare(kbnServer);
    mockSpawnedProcess.emit('exit');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(processExitSpy).toHaveBeenCalledTimes(1);

    consoleErrorSpy.mockReset();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockReset();
    processExitSpy.mockRestore();
  });

  test(`doesn't kill process when nativeController.process exits expectedly`, async () => {
    const kbnServer = {
      settings: {
        plugins: {
          paths: [
            path.resolve(FIXTURES, 'correct')
          ]
        }
      }
    };
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    safeChildProcess.mockReturnValue({ terminating: false });

    await NativeControllers.prepare(kbnServer);
    kbnServer.nativeControllers.correct.killed = true;
    mockSpawnedProcess.emit('exit');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
    expect(processExitSpy).toHaveBeenCalledTimes(0);

    consoleErrorSpy.mockReset();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockReset();
    processExitSpy.mockRestore();
  });

  test(`doesn't kill process when child process is terminating`, async () => {
    const kbnServer = {
      settings: {
        plugins: {
          paths: [
            path.resolve(FIXTURES, 'correct')
          ]
        }
      }
    };
    const processExitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    safeChildProcess.mockReturnValue({ terminating: true });

    await NativeControllers.prepare(kbnServer);
    mockSpawnedProcess.emit('exit');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
    expect(processExitSpy).toHaveBeenCalledTimes(0);

    consoleErrorSpy.mockReset();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockReset();
    processExitSpy.mockRestore();
  });
});

describe('#killOrStart', () => {
  test('starts enabled plugin', async () => {
    const mockNativeController = {
      start: jest.fn().mockReturnValue(Promise.resolve()),
    };
    const kbnServer = {
      pluginSpecs: [{
        getId: () => 'foo'
      }],
      disabledPluginSpecs: [],
      nativeControllers: {
        'foo': mockNativeController
      }
    };

    await NativeControllers.killOrStart(kbnServer);

    expect(mockNativeController.start).toHaveBeenCalledTimes(1);
  });

  test('waits for started$ before resolving killOrStart Promise', async () => {
    expect.hasAssertions();

    let resolved = false;
    let triggerStarted;

    const mockNativeController = {
      start: jest.fn().mockImplementation(() => new Promise(resolve => {
        triggerStarted = () => {
          resolved = true;
          resolve();
        };
      })),
    };
    const kbnServer = {
      pluginSpecs: [{
        getId: () => 'foo'
      }],
      disabledPluginSpecs: [],
      nativeControllers: {
        'foo': mockNativeController
      }
    };


    NativeControllers.killOrStart(kbnServer)
      .then(() => {
        expect(resolved).toBe(true);
      });

    triggerStarted();
  });

  test(`doesn't throw error when enabled plugin doesn't have a nativeController`, async () => {
    const kbnServer = {
      nativeControllers: [],
      pluginSpecs: [{
        getId: () => 'foo'
      }],
      disabledPluginSpecs: [],
    };

    await NativeControllers.killOrStart(kbnServer);
  });

  test('kills disabled plugin', async () => {
    const mockNativeController = {
      kill: jest.fn(),
    };
    const kbnServer = {
      pluginSpecs: [],
      disabledPluginSpecs: [{
        getId: () => 'foo'
      }],
      nativeControllers: {
        'foo': mockNativeController
      }
    };

    await NativeControllers.killOrStart(kbnServer);

    expect(mockNativeController.kill).toHaveBeenCalledTimes(1);
  });

  test(`doesn't throw error when disabled plugin doesn't have a nativeController`, async () => {
    const kbnServer = {
      nativeControllers: [],
      pluginSpecs: [],
      disabledPluginSpecs: [{
        getId: () => 'foo'
      }],
    };

    await NativeControllers.killOrStart(kbnServer);
  });
});

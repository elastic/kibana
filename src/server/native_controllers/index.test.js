import path from 'path';
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
  mockSpawnedProcess = {
    on: jest.fn()
  };
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

    await NativeControllers.prepare(kbnServer);
    const exitCall = mockSpawnedProcess.on.mock.calls.find(call => call[0] === 'exit');
    const onExit = exitCall[1];
    onExit();

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

    await NativeControllers.prepare(kbnServer);
    const exitCall = mockSpawnedProcess.on.mock.calls.find(call => call[0] === 'exit');
    const onExit = exitCall[1];
    kbnServer.nativeControllers.correct.killed = true;
    onExit();

    expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
    expect(processExitSpy).toHaveBeenCalledTimes(0);

    consoleErrorSpy.mockReset();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockReset();
    processExitSpy.mockRestore();
  });
});



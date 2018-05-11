import path from 'path';
import EventEmitter from 'events';
import * as NativeControllers from './index';
import { createNativeController } from './native_controller';
import { spawnNativeController } from './spawn_native_controller';
import { safeChildProcess } from '../../utils/child_process/safe_child_process';
jest.mock('./spawn_native_controller');
jest.mock('../../utils/child_process/safe_child_process');
jest.mock('./native_controller');

const FIXTURES = path.resolve(__dirname, '__fixtures__');
const VALID_FIXTURES = path.resolve(FIXTURES, 'valid');

let mockSpawnedProcess;
let mockNativeControllerConfigure;
beforeEach(() => {
  spawnNativeController.mockClear();
  createNativeController.mockClear();
  mockSpawnedProcess = new EventEmitter();
  spawnNativeController.mockReturnValue(mockSpawnedProcess);

  mockNativeControllerConfigure = jest.fn().mockReturnValue(Promise.resolve());
  createNativeController.mockImplementation((pluginId, process) => {
    return {
      id: 'mock native controller',
      pluginId,
      process,
      configure: mockNativeControllerConfigure,
    };
  });
});

describe('#prepare', () => {
  test(`spawns correct native controller`, async () => {
    const settings = {
      plugins: {
        paths: [path.resolve(VALID_FIXTURES, 'correct')],
      },
    };
    const kbnServer = {
      settings,
    };

    await NativeControllers.prepare(kbnServer);

    expect(spawnNativeController).toHaveBeenCalledTimes(1);
    expect(spawnNativeController).toHaveBeenCalledWith(
      path.resolve(VALID_FIXTURES, 'correct', 'native_controller.js'),
    );
    expect(kbnServer.nativeControllers).toHaveProperty('correct');
  });

  test(`doesn't spawn native controller not specified in the package.json`, async () => {
    const kbnServer = {
      settings: {
        plugins: {
          paths: [path.resolve(VALID_FIXTURES, 'none')],
        },
      },
    };

    await NativeControllers.prepare(kbnServer);

    expect(spawnNativeController).toHaveBeenCalledTimes(0);
  });

  test(`scans plugin directories`, async () => {
    const settings = {
      plugins: {
        scanDirs: [VALID_FIXTURES],
      },
    };

    const kbnServer = {
      settings,
    };

    await NativeControllers.prepare(kbnServer);

    expect(spawnNativeController).toHaveBeenCalledTimes(1);
    expect(spawnNativeController).toHaveBeenCalledWith(
      path.resolve(VALID_FIXTURES, 'correct', 'native_controller.js'),
    );
    expect(kbnServer.nativeControllers).toHaveProperty('correct');
  });

  test(`validates incorrect nativeControllers schema`, () => {
    const settings = {
      plugins: {
        paths: [path.resolve(FIXTURES, 'wrong_schema')],
      },
    };
    const kbnServer = {
      settings,
    };

    return expect(
      NativeControllers.prepare(kbnServer)
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test(`validates no nativeControllers schema`, () => {
    const settings = {
      plugins: {
        paths: [path.resolve(FIXTURES, 'no_schema')],
      },
    };
    const kbnServer = {
      settings,
    };

    return expect(
      NativeControllers.prepare(kbnServer)
    ).rejects.toThrowErrorMatchingSnapshot();
  });

  test(`calls safeChildProcess with the nativeController.process`, async () => {
    const kbnServer = {
      settings: {
        plugins: {
          paths: [path.resolve(VALID_FIXTURES, 'correct')],
        },
      },
    };

    await NativeControllers.prepare(kbnServer);

    expect(safeChildProcess).toHaveBeenCalledWith(mockSpawnedProcess);
  });

  test(`kills process when nativeController.process exits unexpectedly`, async () => {
    const kbnServer = {
      settings: {
        plugins: {
          paths: [path.resolve(VALID_FIXTURES, 'correct')],
        },
      },
      server: {
        log: jest.fn(),
      }
    };
    const processExitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => {});
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    safeChildProcess.mockReturnValue({ terminating: false });

    await NativeControllers.prepare(kbnServer);
    mockSpawnedProcess.emit('exit');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(kbnServer.server.log).toHaveBeenCalledTimes(1);
    expect(processExitSpy).toHaveBeenCalledTimes(1);
    expect(processExitSpy).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockReset();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockReset();
    processExitSpy.mockRestore();
  });

  test(`doesn't kill process when nativeController.process exits expectedly`, async () => {
    const kbnServer = {
      settings: {
        plugins: {
          paths: [path.resolve(VALID_FIXTURES, 'correct')],
        },
      },
      server: {
        log: jest.fn(),
      }
    };
    const processExitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => {});
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    safeChildProcess.mockReturnValue({ terminating: false });

    await NativeControllers.prepare(kbnServer);
    kbnServer.nativeControllers.correct.killed = true;
    mockSpawnedProcess.emit('exit');

    expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
    expect(kbnServer.server.log).toHaveBeenCalledTimes(0);
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
          paths: [path.resolve(VALID_FIXTURES, 'correct')],
        },
      },
    };
    const processExitSpy = jest
      .spyOn(process, 'exit')
      .mockImplementation(() => {});
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

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

  test(`passes config to nativeController.configure`, async () => {
    const kbnServer = {
      settings: {
        plugins: {
          paths: [path.resolve(VALID_FIXTURES, 'correct')],
        },
        path: {
          data: '/tmp/foo'
        }
      },
    };

    await NativeControllers.prepare(kbnServer);

    expect(mockNativeControllerConfigure).toHaveBeenCalledWith({
      'path.data': '/tmp/foo'
    });
  });

  test(`rejects if configure rejects`, async () => {
    const kbnServer = {
      settings: {
        plugins: {
          paths: [path.resolve(VALID_FIXTURES, 'correct')],
        },
        path: {
          data: '/tmp/foo'
        }
      },
    };

    mockNativeControllerConfigure.mockImplementation(() => Promise.reject(new Error('test error')));
    await expect(NativeControllers.prepare(kbnServer)).rejects.toThrowErrorMatchingSnapshot();
  });
});

describe('#killOrStart', () => {
  test('starts enabled plugin', async () => {
    const mockNativeController = {
      start: jest.fn().mockReturnValue(Promise.resolve()),
    };
    const kbnServer = {
      pluginSpecs: [
        {
          getId: () => 'foo',
        },
      ],
      disabledPluginSpecs: [],
      nativeControllers: {
        foo: mockNativeController,
      },
    };

    await NativeControllers.killOrStart(kbnServer);

    expect(mockNativeController.start).toHaveBeenCalledTimes(1);
  });

  test('waits for started$ before resolving killOrStart Promise', async () => {
    expect.hasAssertions();

    let resolved = false;
    let triggerStarted;

    const mockNativeController = {
      start: jest.fn().mockImplementation(
        () =>
          new Promise(resolve => {
            triggerStarted = () => {
              resolved = true;
              resolve();
            };
          })
      ),
    };
    const kbnServer = {
      pluginSpecs: [
        {
          getId: () => 'foo',
        },
      ],
      disabledPluginSpecs: [],
      nativeControllers: {
        foo: mockNativeController,
      },
    };

    NativeControllers.killOrStart(kbnServer).then(() => {
      expect(resolved).toBe(true);
    });

    triggerStarted();
  });

  [[], ['foo'], ['foo', 'bar']].forEach(enabledPlugins => {
    test(`doesn't throw error when ${enabledPlugins.length} enabled plugin(s) don't have a nativeController`, async () => {
      const kbnServer = {
        nativeControllers: [],
        pluginSpecs: enabledPlugins.map(id =>
          ({
            getId: () => id,
          })
        ),
        disabledPluginSpecs: [],
      };

      await NativeControllers.killOrStart(kbnServer);
    });
  });


  test('kills disabled plugin', async () => {
    const mockNativeController = {
      kill: jest.fn(),
    };
    const kbnServer = {
      pluginSpecs: [],
      disabledPluginSpecs: [
        {
          getId: () => 'foo',
        },
      ],
      nativeControllers: {
        foo: mockNativeController,
      },
    };

    await NativeControllers.killOrStart(kbnServer);

    expect(mockNativeController.kill).toHaveBeenCalledTimes(1);
  });

  test(`doesn't throw error when disabled plugin doesn't have a nativeController`, async () => {
    const kbnServer = {
      nativeControllers: [],
      pluginSpecs: [],
      disabledPluginSpecs: [
        {
          getId: () => 'foo',
        },
      ],
    };

    await NativeControllers.killOrStart(kbnServer);
  });

  test(`throws error when nativeController isn't for a known plugin`, () => {
    const kbnServer = {
      nativeControllers: [],
      pluginSpecs: [
        {
          getId: () => 'foo',
        },
      ],
      disabledPluginSpecs: [],
      nativeControllers: {
        bar: {},
      },
    };

    return expect(NativeControllers.killOrStart(kbnServer)).rejects.toThrow();
  });
});

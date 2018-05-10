import EventEmitter from 'events';
import { createNativeController } from './native_controller';

const mockProcess = () => {
  const eventEmitter = new EventEmitter();
  eventEmitter.send = jest.fn();
  eventEmitter.kill = jest.fn();
  return eventEmitter;
};

describe(`#pluginId`, () => {
  test('sets based on the constructor', () => {
    const pluginId = 'foo';
    const nativeController = createNativeController(pluginId, mockProcess());
    expect(nativeController.pluginId).toBe(pluginId);
  });
});

describe('#configure', () => {
  test(`sends configure when it's received ready message before configure is called`, (done) => {
    expect.hasAssertions();

    const proc = mockProcess();
    const nativeController = createNativeController(null, proc);

    proc.emit('message', 'ready');

    const config = {};
    nativeController.configure(config).then(() => {
      expect(proc.send).toHaveBeenCalledTimes(1);
      expect(proc.send).toHaveBeenCalledWith({ type: 'configure', payload: config });
      done();
    });

    proc.emit('message', 'configured');
  });

  test(`sends configure when it's received ready message after configure is called`, (done) => {
    expect.hasAssertions();

    const proc = mockProcess();
    const nativeController = createNativeController(null, proc);

    const config = {};
    nativeController.configure(config).then(() => {
      expect(proc.send).toHaveBeenCalledTimes(1);
      expect(proc.send).toHaveBeenCalledWith({ type: 'configure', payload: config });
      done();
    });

    proc.emit('message', 'ready');
    proc.emit('message', 'configured');
  });

  test(`throws error if you try to configure twice`, async () => {
    const proc = mockProcess();
    const nativeController = createNativeController(null, proc);

    nativeController.configure({});
    await expect(nativeController.configure({})).rejects.toThrowErrorMatchingSnapshot();
  });
});

describe(`#start`, () => {
  test(`throws Error when the proc has been killed before start is called`, async () => {
    expect.hasAssertions();

    const proc = mockProcess();
    proc.killed = true;

    const nativeController = createNativeController(null, proc);
    await expect(nativeController.start()).rejects.toThrowErrorMatchingSnapshot();
  });

  test(`throws Error when start has already been called`, async () => {
    expect.hasAssertions();

    const proc = mockProcess();

    const nativeController = createNativeController(null, proc);
    nativeController.start();
    await expect(nativeController.start()).rejects.toThrowErrorMatchingSnapshot();
  });

  test(`sends start message`, () => {
    expect.hasAssertions();

    const proc = mockProcess();
    const nativeController = createNativeController(null, proc);

    nativeController.start();
    expect(proc.send).toHaveBeenCalledWith({ type: 'start' });
  });

  test(`resolves after receiving started message`, (done) => {
    const proc = mockProcess();
    const nativeController = createNativeController(null, proc);

    nativeController.start().then(() => {
      done();
    });

    proc.emit('message', 'started');
  });
});

describe('#kill', () => {
  test('sets killed to true', () => {
    const nativeController = createNativeController(null, mockProcess());

    nativeController.kill();

    expect(nativeController.killed).toBe(true);
  });

  test('throws error if kill called twice', () => {
    const nativeController = createNativeController(null, mockProcess());

    nativeController.kill();
    expect(() => nativeController.kill()).toThrowErrorMatchingSnapshot();
  });

  test('calls process.kill with SIGKILL', () => {
    const proc = mockProcess();
    const nativeController = createNativeController(null, proc);

    nativeController.kill();
    expect(proc.kill).toHaveBeenCalledTimes(1);
    expect(proc.kill).toHaveBeenCalledWith('SIGKILL');
  });
});

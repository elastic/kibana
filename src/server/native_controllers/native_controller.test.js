import EventEmitter from 'events';
import { NativeController } from './native_controller';

const mockProcess = () => {
  const eventEmitter = new EventEmitter();
  eventEmitter.send = jest.fn();
  eventEmitter.kill = jest.fn();
  return eventEmitter;
};

describe(`#pluginId`, () => {
  test('sets based on the constructor', () => {
    const pluginId = 'foo';
    const nativeController = new NativeController(pluginId, mockProcess());
    expect(nativeController.pluginId).toBe(pluginId);
  });
});

describe(`#start`, () => {
  test(`sends start when it's received ready message before send it called`, (done) => {
    expect.hasAssertions();

    const proc = mockProcess();
    const nativeController = new NativeController(null, proc);

    proc.emit('message', 'ready');

    nativeController.start().then(() => {
      expect(proc.send).toHaveBeenCalledTimes(1);
      expect(proc.send).toHaveBeenCalledWith('start');
      done();
    });

    proc.emit('message', 'started');
  });

  test(`throws Error when the proc has been killed after receiving ready`, (done) => {
    expect.hasAssertions();

    const proc = mockProcess();
    const nativeController = new NativeController(null, proc);

    nativeController.start()
      .catch(err => {
        expect(err).toBeDefined();
        done();
      });

    proc.killed = true;
    proc.emit('message', 'ready');
  });

  test(`sends start when it's received ready message after send it called`, (done) => {
    expect.hasAssertions();

    const proc = mockProcess();
    const nativeController = new NativeController(null, proc);

    nativeController.start().then(() => {
      expect(proc.send).toHaveBeenCalledTimes(1);
      expect(proc.send).toHaveBeenCalledWith('start');
      done();
    });

    proc.emit('message', 'ready');
    proc.emit('message', 'started');
  });
});

describe('#kill', () => {
  test('sets killed to true', () => {
    const nativeController = new NativeController(null, mockProcess());

    nativeController.kill();

    expect(nativeController.killed).toBe(true);
  });

  test('calls process.kill with SIGKILL', () => {
    const proc = mockProcess();
    const nativeController = new NativeController(null, proc);

    nativeController.kill();
    expect(proc.kill).toHaveBeenCalledTimes(1);
    expect(proc.kill).toHaveBeenCalledWith('SIGKILL');
  });
});

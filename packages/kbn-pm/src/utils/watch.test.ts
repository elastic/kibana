import { EventEmitter } from 'events';
import { waitUntilWatchIsReady } from './watch';

describe('#waitUntilWatchIsReady', () => {
  let buildOutputStream: EventEmitter;
  let completionHintPromise: Promise<string>;
  beforeEach(() => {
    jest.useFakeTimers();

    buildOutputStream = new EventEmitter();
    completionHintPromise = waitUntilWatchIsReady(buildOutputStream, {
      handlerDelay: 100,
      handlerReadinessTimeout: 50,
    });
  });

  test('`waitUntilWatchIsReady` correctly handles `webpack` output', async () => {
    buildOutputStream.emit('data', Buffer.from('$ webpack'));
    buildOutputStream.emit('data', Buffer.from('Chunk Names'));

    jest.runAllTimers();

    expect(await completionHintPromise).toBe('webpack');
  });

  test('`waitUntilWatchIsReady` correctly handles `tsc` output', async () => {
    buildOutputStream.emit('data', Buffer.from('$ tsc'));
    buildOutputStream.emit('data', Buffer.from('Compilation complete.'));

    jest.runAllTimers();

    expect(await completionHintPromise).toBe('tsc');
  });

  test('`waitUntilWatchIsReady` fallbacks to default output handler if output is not recognizable', async () => {
    buildOutputStream.emit('data', Buffer.from('$ some-cli'));
    buildOutputStream.emit('data', Buffer.from('Compilation complete.'));
    buildOutputStream.emit('data', Buffer.from('Chunk Names.'));

    jest.runAllTimers();

    expect(await completionHintPromise).toBe('timeout');
  });

  test('`waitUntilWatchIsReady` fallbacks to default output handler if none output is detected', async () => {
    jest.runAllTimers();
    expect(await completionHintPromise).toBe('timeout');
  });

  test('`waitUntilWatchIsReady` fails if output stream receives error', async () => {
    buildOutputStream.emit('error', new Error('Uh, oh!'));

    jest.runAllTimers();

    await expect(completionHintPromise).rejects.toThrow(/Uh, oh!/);
  });
});

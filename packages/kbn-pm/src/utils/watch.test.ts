import { EventEmitter } from 'events';
import { waitUntilWatchIsReady } from './watch';

test('`waitUntilWatchIsReady` correctly handles `webpack` output', async () => {
  const buildOutputStream = new EventEmitter();
  const completionHintPromise = waitUntilWatchIsReady(buildOutputStream);

  buildOutputStream.emit('data', Buffer.from('$ webpack'));
  buildOutputStream.emit('data', Buffer.from('Chunk Names'));

  expect(await completionHintPromise).toBe('webpack');
});

test('`waitUntilWatchIsReady` correctly handles `tsc` output', async () => {
  const buildOutputStream = new EventEmitter();
  const completionHintPromise = waitUntilWatchIsReady(buildOutputStream);

  buildOutputStream.emit('data', Buffer.from('$ tsc'));
  buildOutputStream.emit('data', Buffer.from('Compilation complete.'));

  expect(await completionHintPromise).toBe('tsc');
});

test(
  '`waitUntilWatchIsReady` fallbacks to default output handler if output is not recognizable',
  async () => {
    const buildOutputStream = new EventEmitter();
    const completionHintPromise = waitUntilWatchIsReady(buildOutputStream);

    buildOutputStream.emit('data', Buffer.from('$ some-cli'));
    buildOutputStream.emit('data', Buffer.from('Compilation complete.'));
    buildOutputStream.emit('data', Buffer.from('Chunk Names.'));

    expect(await completionHintPromise).toBe('timeout');
  },
  10000
);

test(
  '`waitUntilWatchIsReady` fallbacks to default output handler if none output is detected',
  async () => {
    const buildOutputStream = new EventEmitter();
    const completionHintPromise = waitUntilWatchIsReady(buildOutputStream);

    expect(await completionHintPromise).toBe('timeout');
  },
  10000
);

test('`waitUntilWatchIsReady` fails if output stream receives error', async () => {
  const buildOutputStream = new EventEmitter();
  const completionHintPromise = waitUntilWatchIsReady(buildOutputStream);

  buildOutputStream.emit('error', new Error('Uh, oh!'));

  await expect(completionHintPromise).rejects.toThrow(/Uh, oh!/);
});

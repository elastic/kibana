import { $bindNodeCallback } from './bind_node_callback';
import { collect } from '../lib/collect';

type NodeCallback = (err: any, val?: string) => void;

test('callback with error', async () => {
  const error = new Error('fail');
  const func = (cb: NodeCallback) => cb(error);

  const boundCallback = $bindNodeCallback(func);
  const res = collect(boundCallback());

  expect(await res).toEqual([error]);
});

test('should emit undefined from a callback without arguments', async () => {
  const func = (cb: NodeCallback) => cb(undefined);

  const boundCallback = $bindNodeCallback(func);
  const res = collect(boundCallback());

  expect(await res).toEqual([undefined, 'C']);
});

test('callback with value', async () => {
  const func = (cb: NodeCallback) => cb(undefined, 'test');

  const boundCallback = $bindNodeCallback(func);
  const res = collect(boundCallback());

  expect(await res).toEqual(['test', 'C']);
});

test('does not treat `null` as error', async () => {
  const func = (cb: NodeCallback) => cb(null, 'test');

  const boundCallback = $bindNodeCallback(func);
  const res = collect(boundCallback());

  expect(await res).toEqual(['test', 'C']);
});

test('multiple args', async () => {
  const func = (arg1: string, arg2: number, cb: NodeCallback) =>
    cb(undefined, `${arg1}/${arg2}`);

  const boundCallback = $bindNodeCallback(func);
  const res = collect(boundCallback('foo', 123));

  expect(await res).toEqual(['foo/123', 'C']);
});

test('function throws instead of calling callback', async () => {
  const error = new Error('fail');

  const func = (cb: NodeCallback) => {
    throw error;
  };

  const boundCallback = $bindNodeCallback(func);
  const res = collect(boundCallback());

  expect(await res).toEqual([error]);
});

test('errors if callback is called with more than two args', async () => {
  const func = (cb: Function) => cb(undefined, 'arg1', 'arg2');

  const boundCallback = $bindNodeCallback(func);
  const res = collect(boundCallback());

  expect(await res).toMatchSnapshot();
});

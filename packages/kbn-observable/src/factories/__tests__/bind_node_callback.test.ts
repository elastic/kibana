import { $bindNodeCallback } from '../$bindNodeCallback';
import { collect } from '../../lib/collect';

type NodeCallback = (err: any, val?: string) => void;

test('callback with error', async () => {
  const error = new Error('fail');
  const read = (cb: NodeCallback) => cb(error);

  const read$ = $bindNodeCallback(read);
  const res = collect(read$());

  expect(await res).toEqual([error]);
});

test('callback with value', async () => {
  const read = (cb: NodeCallback) => cb(undefined, 'test');

  const read$ = $bindNodeCallback(read);
  const res = collect(read$());

  expect(await res).toEqual(['test', 'C']);
});

test('does not treat `null` as error', async () => {
  const read = (cb: NodeCallback) => cb(null, 'test');

  const read$ = $bindNodeCallback(read);
  const res = collect(read$());

  expect(await res).toEqual(['test', 'C']);
});

test('multiple args', async () => {
  const read = (arg1: string, arg2: number, cb: NodeCallback) =>
    cb(undefined, `${arg1}/${arg2}`);

  const read$ = $bindNodeCallback(read);
  const res = collect(read$('foo', 123));

  expect(await res).toEqual(['foo/123', 'C']);
});

test('function throws instead of calling callback', async () => {
  const error = new Error('fail');

  const read = (cb: NodeCallback) => {
    throw error;
  };

  const read$ = $bindNodeCallback(read);
  const res = collect(read$());

  expect(await res).toEqual([error]);
});

test('errors if callback is called with more than two args', async () => {
  const read = (cb: Function) => cb(undefined, 'arg1', 'arg2');

  const read$ = $bindNodeCallback(read);
  const res = collect(read$());

  expect(await res).toMatchSnapshot();
});

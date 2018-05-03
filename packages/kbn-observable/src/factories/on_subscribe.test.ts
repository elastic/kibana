import { $onSubscribe } from './on_subscribe';
import { $of } from './of';
import { collect } from '../lib/collect';

test('calls observable factory when subscribed', () => {
  const observableFactory = jest.fn();

  const obs = $onSubscribe(observableFactory);

  expect(observableFactory).not.toHaveBeenCalled();

  obs.subscribe();

  expect(observableFactory).toHaveBeenCalledTimes(1);
});

test('subscribes to returned observable', async () => {
  const obs = $onSubscribe(() => $of('foo', 'bar'));

  const res = collect(obs);

  expect(await res).toEqual(['foo', 'bar', 'C']);
});

test('calls factory on every subscribe', async () => {
  let i = 0;
  const obs = $onSubscribe(() => $of(i++));

  expect(await collect(obs)).toEqual([0, 'C']);
  expect(await collect(obs)).toEqual([1, 'C']);
  expect(await collect(obs)).toEqual([2, 'C']);
});

test('emits error if factory throws', async () => {
  const error = new Error('foo');
  const obs = $onSubscribe(() => {
    throw error;
  });

  expect(await collect(obs)).toEqual([error]);
});

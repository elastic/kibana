import { Observable, Subscription } from '../observable';

/**
 * Test helper used to track the first `subscribe` on each of the input
 * observables.
 *
 * If Jest was able to track return values from `spyOn`s, this would be much
 * simpler. See https://github.com/facebook/jest/issues/3821 for the Jest issue
 * to add this feature.
 */
export function trackSubscriptions<T>(...observables: Observable<T>[]) {
  const subscriptions: Subscription[] = [];

  for (const observable of observables) {
    const originalSubscribe = observable.subscribe;

    jest.spyOn(observable, 'subscribe').mockImplementation(observer => {
      const subscription = originalSubscribe.call(observable, observer);
      subscriptions.push(subscription);
      return subscription;
    });
  }

  return {
    async ensureSubscriptionsAreClosed(
      numberOfSubscriptions = observables.length
    ) {
      expect(subscriptions).toHaveLength(numberOfSubscriptions);

      for (const subscription of subscriptions) {
        expect(subscription.closed).toBe(true);
      }
    },
  };
}

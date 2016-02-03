import CourierFetchFetchProvider from 'ui/courier/fetch/fetch';
import CourierLooperLooperProvider from 'ui/courier/looper/_looper';
import CourierFetchStrategyDocProvider from 'ui/courier/fetch/strategy/doc';

export default function DocLooperService(Private) {
  var fetch = Private(CourierFetchFetchProvider);
  var Looper = Private(CourierLooperLooperProvider);
  var docStrategy = Private(CourierFetchStrategyDocProvider);

  /**
   * The Looper which will manage the doc fetch interval
   * @type {Looper}
   */
  var docLooper = new Looper(1500, function () {
    fetch.fetchQueued(docStrategy);
  });

  return docLooper;
};

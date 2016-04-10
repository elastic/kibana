import FetchProvider from '../fetch';
import LooperProvider from './_looper';
import DocStrategyProvider from '../fetch/strategy/doc';

export default function DocLooperService(Private) {
  var fetch = Private(FetchProvider);
  var Looper = Private(LooperProvider);
  var DocStrategy = Private(DocStrategyProvider);

  /**
   * The Looper which will manage the doc fetch interval
   * @type {Looper}
   */
  var docLooper = new Looper(1500, function () {
    fetch.fetchQueued(DocStrategy);
  });

  return docLooper;
};

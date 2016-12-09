import FetchProvider from '../fetch';
import LooperProvider from './_looper';
import DocStrategyProvider from '../fetch/strategy/doc_admin';

export default function DocLooperService(Private) {
  let fetch = Private(FetchProvider);
  let Looper = Private(LooperProvider);
  let DocStrategy = Private(DocStrategyProvider);

  /**
   * The Looper which will manage the doc fetch interval
   * @type {Looper}
   */
  let docLooper = new Looper(1500, function () {
    fetch.fetchQueued(DocStrategy);
  });

  return docLooper;
};

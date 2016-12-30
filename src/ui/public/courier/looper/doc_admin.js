import FetchProvider from '../fetch';
import LooperProvider from './_looper';
import DocStrategyProvider from '../fetch/strategy/doc_admin';

export default function DocLooperService(Private) {
  const fetch = Private(FetchProvider);
  const Looper = Private(LooperProvider);
  const DocStrategy = Private(DocStrategyProvider);

  /**
   * The Looper which will manage the doc fetch interval
   * @type {Looper}
   */
  const docLooper = new Looper(1500, function () {
    fetch.fetchQueued(DocStrategy);
  });

  return docLooper;
}

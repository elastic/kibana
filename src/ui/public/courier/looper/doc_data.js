import { FetchProvider } from '../fetch';
import { LooperProvider } from './_looper';
import { DocDataStrategyProvider } from '../fetch/strategy/doc_data';

export function DocDataLooperProvider(Private) {
  const fetch = Private(FetchProvider);
  const Looper = Private(LooperProvider);
  const DocStrategy = Private(DocDataStrategyProvider);

  /**
   * The Looper which will manage the doc fetch interval
   * @type {Looper}
   */
  const docLooper = new Looper(1500, function () {
    fetch.fetchQueued(DocStrategy);
  });

  return docLooper;
}

import { FetchProvider } from '../fetch';
import { LooperProvider } from './_looper';
import { DocAdminStrategyProvider } from '../fetch/strategy/doc_admin';

export function DocAdminLooperProvider(Private) {
  const fetch = Private(FetchProvider);
  const Looper = Private(LooperProvider);
  const DocStrategy = Private(DocAdminStrategyProvider);

  /**
   * The Looper which will manage the doc fetch interval
   * @type {Looper}
   */
  const docLooper = new Looper(1500, function () {
    fetch.fetchQueued(DocStrategy);
  });

  return docLooper;
}

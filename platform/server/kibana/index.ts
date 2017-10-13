import { Observable } from 'kbn-observable';

import { KibanaConfig } from './KibanaConfig';

export { KibanaConfig };

/** @internal */
export class KibanaModule {
  constructor(readonly config$: Observable<KibanaConfig>) {}
}

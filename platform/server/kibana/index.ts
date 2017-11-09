import { Observable } from '@elastic/kbn-observable';

import { KibanaConfig } from './KibanaConfig';

export { KibanaConfig };

/** @internal */
export class KibanaModule {
  constructor(readonly config$: Observable<KibanaConfig>) {}
}

import { Observable } from '@kbn/observable';

import { KibanaConfig } from './kibana_config';

export { KibanaConfig };

/** @internal */
export class KibanaModule {
  constructor(readonly config$: Observable<KibanaConfig>) {}
}

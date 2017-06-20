import { Observable } from 'rxjs';

import { KibanaConfig } from './KibanaConfig';

export { KibanaConfig };

export class KibanaModule {
  constructor(readonly config$: Observable<KibanaConfig>) {}
}

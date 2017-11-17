import { Observable } from '@elastic/kbn-observable';

import { SavedObjectsConfig } from './SavedObjectsConfig';

export { SavedObjectsConfig };

/** @internal */
export class SavedObjectsModule {
  constructor(readonly config$: Observable<SavedObjectsConfig>) {}
}


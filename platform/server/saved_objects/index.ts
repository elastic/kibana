import { Observable } from '@elastic/kbn-observable';
import { KibanaPluginConfig } from '../plugins/types';

import { SavedObjectsConfig } from './SavedObjectsConfig';
import { registerEndpoints } from './registerEndpoints';

export { SavedObjectsConfig };

export class SavedObjectsModule {
  constructor(
    readonly config$: Observable<SavedObjectsConfig>,
  ) {
    //this.service = new SavedObjectsService(this.config$, logger, router);
  }
}

export const plugin: KibanaPluginConfig<{}> = {
  plugin: core => {
    const { elasticsearch, logger, util, http } = core;
    const config$ = core.kibana.config$;

    const log = logger.get('Saved Objects');

    log.info('create saved objects plugin');

    const router = http.createAndRegisterRouter('/api/saved_objects');

    log.info('register saved objects endpoints');
    registerEndpoints(router, logger, util.schema, elasticsearch.service, config$);
  }
};

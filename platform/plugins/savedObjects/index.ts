import { KibanaFunctionalPlugin } from '../../server/plugins/types';
import { SavedObjectsFacade } from './SavedObjectsFacade';
import { registerEndpoints } from './registerEndpoints';

export const dependencies = [];

export const plugin: KibanaFunctionalPlugin<{}> = kibana => {
  const { kibana: k, elasticsearch, logger, util, http } = kibana;

  const log = logger.get();

  log.info('creating savedObjects plugin');

  const router = http.createAndRegisterRouter('/api/saved_objects', {
    // TODO This should _NOT_ inject `req`, but rather the correct cluster
    // preset with the request (so it sets headers etc). However, that requires
    // changes to the `ElasticsearchClient`, it looks like.
    onRequest: req => new SavedObjectsFacade(req, k.config$, elasticsearch.service)
  });

  registerEndpoints(router, logger, util.schema);
}

import _ from 'lodash';
import handleESError from '../../../lib/handle_es_error';

export function registerLanguages(server) {
  server.route({
    path: '/api/kibana/scripts/languages',
    method: 'GET',
    handler: function (request, reply) {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

      return callWithRequest(request, 'cluster.getSettings', {
        include_defaults: true,
        filter_path: '**.script.engine.*.inline'
      })
      .then((esResponse) => {
        const langs = _.get(esResponse, 'defaults.script.engine', {});
        const inlineLangs = _.pick(langs, (lang) => lang.inline === 'true');
        const supportedLangs = _.omit(inlineLangs, 'mustache');
        return _.keys(supportedLangs);
      })
      .then(reply)
      .catch((error) => {
        reply(handleESError(error));
      });
    }
  });
}

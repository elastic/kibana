import { partial } from 'lodash';
import pipelineSchema from '../../../../lib/pipelines/pipeline/schema';
import pipelineConverterProvider from '../../../../lib/pipelines/pipeline/converter';
import handleESError from '../../../../lib/handle_es_error';

export default (server) => {
  const pipelineConverter = pipelineConverterProvider(server);
  const kibanaIndex = server.config().get('kibana.index');

  server.route({
    path: '/api/kibana/pipelines/pipeline',
    method: 'PUT',
    config: {
      validate: {
        payload: pipelineSchema
      }
    },
    handler: function (request, reply) {
      const boundCallWithRequest = partial(server.plugins.elasticsearch.callWithRequest, request);
      const pipelineApiDocument = request.payload;
      const body = pipelineConverter.kibanaToEs(pipelineApiDocument);

      return boundCallWithRequest('transport.request', {
        path: `/_ingest/pipeline/${pipelineApiDocument.pipeline_id}`,
        method: 'PUT',
        body: body
      })
      .then(boundCallWithRequest('index', {
        index: kibanaIndex,
        type: 'pipeline-meta',
        id: pipelineApiDocument.pipeline_id,
        body: {
          'sample-index': pipelineApiDocument.sample_index,
          samples: pipelineApiDocument.samples
        }
      }))
      .then(reply)
      .catch((error) => {
        reply(handleESError(error));
      });
    }
  });
};

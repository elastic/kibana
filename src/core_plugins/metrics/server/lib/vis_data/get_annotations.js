import calculateIndices from './calculate_indices';
import buildAnnotationRequest from './build_annotation_request';
import handleAnnotationResponse from './handle_annotation_response';

function validAnnotation(annotation) {
  return annotation.index_pattern &&
    annotation.time_field &&
    annotation.fields &&
    annotation.icon &&
    annotation.template;
}

export default (req, panel) => {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
  return Promise.all(panel.annotations
    .filter(validAnnotation)
    .map(annotation => {

      const indexPattern = annotation.index_pattern;
      const timeField = annotation.time_field;

      return calculateIndices(req, indexPattern, timeField).then(indices => {
        const bodies = [];

        if (!indices.length) throw new Error('missing-indices');
        bodies.push({
          index: indices,
          ignore: [404],
          timeout: '90s',
          requestTimeout: 90000,
          ignoreUnavailable: true,
        });

        bodies.push(buildAnnotationRequest(req, panel, annotation));
        return bodies;
      });
    }))
    .then(bodies => {
      if (!bodies.length) return { responses: [] };
      return callWithRequest(req, 'msearch', {
        body: bodies.reduce((acc, item) => acc.concat(item), [])
      });
    })
    .then(resp => {
      const results = {};
      panel.annotations
        .filter(validAnnotation)
        .forEach((annotation, index) => {
          const data = resp.responses[index];
          results[annotation.id] = handleAnnotationResponse(data, annotation);
        });
      return results;
    })
    .catch(error => {
      if (error.message === 'missing-indices') return {};
      throw error;
    });
};


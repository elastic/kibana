import buildAnnotationRequest from './build_annotation_request';
import handleAnnotationResponse from './handle_annotation_response';

function validAnnotation(annotation) {
  return annotation.index_pattern &&
    annotation.time_field &&
    annotation.fields &&
    annotation.icon &&
    annotation.template;
}

export default async (req, panel) => {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
  const bodies = panel.annotations
    .filter(validAnnotation)
    .map(annotation => {

      const indexPattern = annotation.index_pattern;
      const bodies = [];

      bodies.push({
        index: indexPattern,
        ignore: [404],
        timeout: '90s',
        requestTimeout: 90000,
        ignoreUnavailable: true,
      });

      bodies.push(buildAnnotationRequest(req, panel, annotation));
      return bodies;
    });

  if (!bodies.length) return { responses: [] };
  try {
    const resp = await callWithRequest(req, 'msearch', {
      body: bodies.reduce((acc, item) => acc.concat(item), [])
    });
    const results = {};
    panel.annotations
      .filter(validAnnotation)
      .forEach((annotation, index) => {
        const data = resp.responses[index];
        results[annotation.id] = handleAnnotationResponse(data, annotation);
      });
    return results;
  } catch (error) {
    if (error.message === 'missing-indices') return { responses: [] };
    throw error;
  }

};


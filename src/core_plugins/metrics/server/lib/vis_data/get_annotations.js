import _ from 'lodash';
import moment from 'moment';
import calculateIndices from '../calculate_indices';
import buildAnnotationRequest from './build_annotation_request';
import handleAnnotationResponse from './handle_annotation_response';

export default (req, panel) => {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
  return Promise.all(panel.annotations.map(annotation => {

    const indexPattern = annotation.index_pattern;
    const timeField = annotation.time_field;

    return calculateIndices(req, indexPattern, timeField).then(indices => {
      const bodies = [];

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
      return callWithRequest(req, 'msearch', {
        body: bodies.reduce((acc, item) => acc.concat(item), [])
      });
    })
    .then(resp => {
      const results = {};
      panel.annotations.forEach((annotation, index) => {
        const data = resp.responses[index];
        results[annotation.id] = handleAnnotationResponse(data, annotation);
      });
      return results;
    });
};


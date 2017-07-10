import buildRequestBody from './build_request_body';
export default (req, panel, entities) => {
  const bodies = [];
  entities.forEach(entity => {
    bodies.push({
      index: panel.index_pattern,
      ignore: [404],
      timeout: '90s',
      requestTimeout: 90000,
      ignoreUnavailable: true,
    });
    bodies.push(buildRequestBody(req, panel, entity));
  });
  return bodies;
};

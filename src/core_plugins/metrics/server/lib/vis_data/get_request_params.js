import buildRequestBody from './build_request_body';

export default (req, panel, series) => {
  const indexPattern = series.override_index_pattern && series.series_index_pattern || panel.index_pattern;
  const bodies = [];

  bodies.push({
    index: indexPattern,
    ignore: [404],
    timeout: '90s',
    requestTimeout: 90000,
    ignoreUnavailable: true,
  });

  bodies.push(buildRequestBody(req, panel, series));
  return bodies;
};

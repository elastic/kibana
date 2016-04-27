const _ = require('lodash');

export default function processESIngestProcessorsResponse(response) {
  const nodes = _.get(response, 'nodes');

  const results = _.chain(nodes)
    .map('ingest.processors')
    .reduce((result, processors) => {
      return result.concat(processors);
    })
    .map('type')
    .unique()
    .value();

  return results;
};

import { sortBy, uniq } from 'lodash';

export function getParams(req) {
  const index = req.query.index || '*';
  return {
    index,
    fields: ['*'],
    ignoreUnavailable: false,
    allowNoIndices: false,
  };
}

export function handleResponse(resp) {
  const fields = Object.keys(resp.fields)
    .map(name => {
      const def = resp.fields[name];
      const type = Object.keys(def)[0];
      const { aggregatable } = def[type];
      return { name, type, aggregatable };
    })
    .filter(field => field.aggregatable);
  return uniq(sortBy(fields));
}

function getFields(req) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
  const params = getParams(req);
  return callWithRequest(req, 'fieldCaps', params).then(handleResponse);
}

export default getFields;


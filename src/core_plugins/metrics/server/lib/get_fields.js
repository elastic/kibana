import _ from 'lodash';

export function getParams(req) {
  const index = req.query.index || '*';
  return {
    index,
    fields: ['*'],
    ignoreUnavailable: false,
    allowNoIndices: false,
    includeDefaults: true
  };
}

export function handleResponse(resp) {
  return _.reduce(resp, (acc, index) => {
    _.each(index.mappings, (type) => {
      _.each(type, (field, fullName) => {
        const name = _.last(fullName.split(/\./));
        const enabled = _.get(field, `mapping.${name}.enabled`, true);
        const fieldType = _.get(field, `mapping.${name}.type`);
        if (enabled && fieldType) {
          acc.push({
            name: _.get(field, 'full_name', fullName),
            type: fieldType
          });
        }
      });
    });
    return _(acc).sortBy('name').uniq(row => row.name).value();
  }, []);
}

function getFields(req) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
  const params = getParams(req);
  return callWithRequest(req, 'indices.getFieldMapping', params).then(handleResponse);
}

export default getFields;


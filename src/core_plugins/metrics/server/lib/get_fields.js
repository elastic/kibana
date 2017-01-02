import _ from 'lodash';
export default (req) => {
  const { server } = req;
  const config = server.config();
  const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
  const index = req.query.index || '*';

  return () => {
    const params = {
      index,
      fields: ['*'],
      ignoreUnavailable: false,
      allowNoIndices: false,
      includeDefaults: true
    };
    return callWithRequest(req, 'indices.getFieldMapping', params)
    .then((resp) => {
      return _.reduce(resp, (acc, index, key) => {
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
    });
  };
};


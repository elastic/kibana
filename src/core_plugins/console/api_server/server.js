import _ from 'lodash';

export function resolveApi(senseVersion, apis, reply) {
  const result = {};
  _.each(apis, function (name) {
    {
      // for now we ignore sense_version. might add it in the api name later
      const api = require('./' + name);
      result[name] = api.asJson();
    }
  });

  return reply(result).type('application/json');
}

const app = require('ui/modules').get('kibana');
const _ = require('lodash');

const Logger = require('../lib/logger');
const logger = new Logger('ingest service', true);

app.service('ingest', function ($http) {
  return {
    simulatePipeline: simulatePipeline
  };

  function simulatePipeline(pipeline) {
    const data = angular.toJson(pipeline);

    return $http.post(`/api/kibana/simulate`, data)
    .then((result) => {
      return result.data;
    })
    .catch((err) => {
      throw('Error communicating with Kibana server');
    });
  }
});

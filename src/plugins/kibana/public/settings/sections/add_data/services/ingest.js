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

    console.log(data);
    return $http.post(`/api/kibana/simulate`, data)
    .then((result) => {
      //if there was an error, then it was in communicating with the kibana server.
      //All error handling of the elastic endpoint should happen on the server. This
      //request is going to do one of two things:
      //  1. fail because the server is down
      //  2. succeed with a packaged response from the server.
      //output the message to a Notify object..... on second thought this shouldn't happen
      //on this level... need to think about this more.

      console.log('client - ingest service', result);
      return result.data;
    });
  }
});

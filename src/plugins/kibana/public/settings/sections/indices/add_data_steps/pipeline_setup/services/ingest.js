const app = require('ui/modules').get('kibana');
import _  from 'lodash';
import angular from 'angular';
import { keysToCamelCaseShallow, keysToSnakeCaseShallow } from '../lib/case_conversion';

app.service('ingest', function ($http) {
  return {
    simulatePipeline: simulatePipeline
  };

  function packageData(pipeline) {
    // let apiPipeline = _.pick(pipeline, ['input', 'processors']);
    // apiPipeline = keysToSnakeCaseShallow(apiPipeline);
    // apiPipeline.processors = apiPipeline.processors.map((processor) => {
    //   let apiProcessor = _.omit(processor, ['$$hashKey', 'collapsed', 'description', ]);
    //   return keysToSnakeCaseShallow(apiProcessor);
    // });

    // console.log('object', apiPipeline);
    // const json = angular.toJson(apiPipeline);
    // //console.log('json', json);
    // return json;

    const data = {
      input: pipeline.input,
      processors: [
        {
          processor_id: pipeline.processors[0].processorId,
          type_id: pipeline.processors[0].typeId,
          target_field: pipeline.processors[0].targetField,
          value: pipeline.processors[0].value
        }
      ]
    };
    return angular.toJson(data);
  }

  function unpackageResult(result) {
    //console.log('unpackageResult - input', result);
    const data = result.data.map((processorResult) => keysToCamelCaseShallow(processorResult));
    //console.log('unpackageResult - output', data);
    return data;
  }

  function simulatePipeline(pipeline) {
    const data = packageData(pipeline);
    console.log('simulatePipeline', data);

    return $http.post(`../api/kibana/ingest/simulate`, data)
    .then(unpackageResult)
    .catch((err) => {
      throw ('Error communicating with Kibana server');
    });
  }
});

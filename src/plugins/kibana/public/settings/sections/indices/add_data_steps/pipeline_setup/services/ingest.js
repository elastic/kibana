import uiModules from 'ui/modules';
import _  from 'lodash';
import angular from 'angular';
import { keysToCamelCaseShallow, keysToSnakeCaseShallow } from '../../../../../../../common/lib/case_conversion';

const module = uiModules.get('kibana');

module.service('ingest', function ($http) {
  return {
    simulatePipeline: simulatePipeline
  };

  function packagePipeline(pipeline) {
    const requiredFields = ['input', 'processors'];
    const cleanedPipeline = _.pick(pipeline, requiredFields);
    return keysToSnakeCaseShallow(cleanedPipeline);
  }

  function packageProcessor(processor) {
    const uiFields = [
      '$$hashKey',
      'collapsed',
      'description',
      'error',
      'getDescription',
      'inputObject',
      'outputObject',
      'parent',
      'setParent',
      'title',
      'updateDescription'
    ];

    const cleanedProcessor = _.omit(processor, uiFields);
    return keysToSnakeCaseShallow(cleanedProcessor);
  }

  function packageRequest(pipeline) {
    const apiPipeline = packagePipeline(pipeline);
    apiPipeline.processors = apiPipeline.processors.map((processor) => packageProcessor(processor));
    return angular.toJson(apiPipeline);
  }

  function unpackageResult(result) {
    const data = result.data.map((processorResult) => keysToCamelCaseShallow(processorResult));
    return data;
  }

  function simulatePipeline(pipeline) {
    const data = packageRequest(pipeline);

    return $http.post(`../api/kibana/ingest/simulate`, data)
    .then(unpackageResult)
    .catch((err) => {
      throw ('Error communicating with Kibana server');
    });
  }
});

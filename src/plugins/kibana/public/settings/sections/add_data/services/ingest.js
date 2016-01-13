const app = require('ui/modules').get('kibana');
const _ = require('lodash');

app.service('ingest', function ($http) {
  return {
    simulate: simulate,
    simulatePipeline: simulatePipeline
  };

  function buildBody(sourceObject, processors) {
    const body = {
      'pipeline': {
        'processors': []
      },
      'docs': [
        {
          _source: sourceObject
        }
      ]
    };

    processors.forEach((processor) => {
      body.pipeline.processors.push(processor.getDefinition());
    });

    return body;
  }

  function simulate(processor) {
    const body = buildBody(processor.inputObject, [processor]);

    console.log('simulate request', body);

    //TODO: How to handle errors
    return $http.post(`/api/kibana/simulate`, body)
    .then(function (result) {
      console.log('simulate response', result);
      if (!result.data)
        return;

      const processorResults = _.get(result, 'data.docs[0].processor_results');
      const output = processorResults.map((processorResult) => {
        return {
          processorId: _.get(processorResult, 'processor_id'),
          output: _.get(processorResult, 'doc._source'),
          error: _.get(processorResult, 'error')
        }
      });

      return output;
    });
  }

  function simulatePipeline(pipeline) {
    const body = buildBody(pipeline.rootObject, pipeline.processors);

    console.log('simulate request', body);

    //TODO: How to handle errors
    return $http.post(`/api/kibana/simulate`, body)
    .then(function (result) {
      if (!result.data)
        return;

      const processorResults = _.get(result, 'data.docs[0].processor_results');
      const output = processorResults.map((processorResult) => {
        return {
          processorId: _.get(processorResult, 'processor_id'),
          output: _.get(processorResult, 'doc._source'),
          error: _.get(processorResult, 'error')
        }
      });

      return output;
    });
  }
});

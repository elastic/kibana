const app = require('ui/modules').get('kibana');
const _ = require('lodash');

app.service('ingest', function ($http) {
  return {
    simulate: simulate,
    simulatePipeline: simulatePipeline
  };

  function buildBody() {
    return {
      'pipeline': {
        'description': '_description',
        'processors': []
      },
      'docs': [
        {
          '_index': 'index',
          '_type': 'type',
          '_id': 'id'
        }
      ]
    };
  }

  function simulate(processor) {
    const body = buildBody();
    body.docs[0]._source = processor.inputObject;
    body.pipeline.processors.push(processor.getDefinition());

    console.log('simulate request', body);

    //TODO: How to handle errors
    return $http.post(`/api/kibana/simulate`, body)
    .then(function (result) {
      console.log('simulate response', result);
      let outputObject = {};

      if (result.data) {
        const processorResults = _.get(result, 'data.docs[0].processor_results');
        const processorResult = processorResults[0];
        outputObject = _.get(processorResult, 'doc._source');

        return outputObject;
      }

    });
  }

  function simulatePipeline(pipeline) {
    const body = buildBody();
    body.docs[0]._source = processor.inputObject;
    pipeline.forEach((processor) => {
      body.pipeline.processors.push(processor.getDefinition());
    });

    //TODO: How to handle errors
    return $http.post(`/api/kibana/simulate`, body)
    .then(function (result) {
      if (!result.data)
        return;

      debugger;
      const processorResults = _.get(result, 'data.docs[0].processor_results');
      const processorResult = processorResults[0];
      const outputObject = _.get(processorResult, 'doc._source');

      return outputObject;
    });
  }
});

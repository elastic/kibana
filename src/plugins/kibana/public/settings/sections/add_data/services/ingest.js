const app = require('ui/modules').get('kibana');
const _ = require('lodash');

app.service('ingest', function ($http) {
  return {
    simulate: simulate
  };

  function buildBodyBase(processor) {
    return {
      'pipeline': {
        'description': '_description',
        'processors': []
      },
      'docs': [
        {
          '_index': 'index',
          '_type': 'type',
          '_id': 'id',
          '_source': processor.inputObject
        }
      ]
    };
  }

  function buildBodyGeoIp(processor) {
    const body = buildBodyBase(processor);

    body.pipeline.processors.push({
        'geoip' : {
          'source_field' : processor.sourceField,
          'target_field': processor.targetField
        }
    });

    return body;
  }

  function buildBodyGrok(processor) {
    const body = buildBodyBase(processor);

    body.pipeline.processors.push({
        'grok' : {
          'field' : processor.sourceField,
          'pattern': processor.pattern
        }
    });

    return body;
  }

  function buildBodySet(processor) {
    const body = buildBodyBase(processor);

    body.pipeline.processors.push({
        'set' : {
          'field' : processor.targetField,
          'value': processor.value
        }
    });

    return body;
  }

  function buildBodyAppend(processor) {
    const body = buildBodyBase(processor);

    body.pipeline.processors.push({
        'set' : {
          'field' : processor.targetField,
          'value': processor.values
        }
    });

    return body;
  }

  function buildBodyRename(processor) {
    const body = buildBodyBase(processor);

    body.pipeline.processors.push({
        'rename' : {
          'field' : processor.sourceField,
          'to': processor.targetField
        }
    });

    return body;
  }

  function buildBody(processor) {
    switch(processor.typeid) {
      case 'geoip':
        return buildBodyGeoIp(processor);
        break;
      case 'grok':
        return buildBodyGrok(processor);
        break;
      case 'set':
        return buildBodySet(processor);
        break;
      case 'append':
        return buildBodyAppend(processor);
        break;
      case 'rename':
        return buildBodyRename(processor);
        break;
    }
  }

  function simulate(processor) {
    const body = buildBody(processor);

    console.log('simulate', body);
    //TODO: How to handle errors
    return $http.post(`/api/kibana/simulate`, body)
    .then(function (result) {
      if (!result.data)
        return;

      const processorResults = _.get(result, 'data.docs[0].processor_results');
      const processorResult = processorResults[0];
      const outputObject = _.get(processorResult, 'doc._source');

      return outputObject;
    });
  }
});

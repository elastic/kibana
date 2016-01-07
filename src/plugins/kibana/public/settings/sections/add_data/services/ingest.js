const app = require('ui/modules').get('kibana');
const _ = require('lodash');

app.service('ingest', function ($http) {
  return {
    simulate: simulate,
    simulatePipeline: simulatePipeline
  };

  // function buildBodyBase(processor) {
  //   return {
  //     'pipeline': {
  //       'description': '_description',
  //       'processors': []
  //     },
  //     'docs': [
  //       {
  //         '_index': 'index',
  //         '_type': 'type',
  //         '_id': 'id',
  //         '_source': processor.inputObject
  //       }
  //     ]
  //   };
  // }

  // function buildBodyGeoIp(processor) {
  //   const body = buildBodyBase(processor);

  //   body.pipeline.processors.push({
  //       'geoip' : {
  //         'source_field' : processor.sourceField,
  //         'target_field': processor.targetField
  //       }
  //   });

  //   return body;
  // }

  // function buildBodyGrok(processor) {
  //   const body = buildBodyBase(processor);

  //   body.pipeline.processors.push({
  //       'grok' : {
  //         'field' : processor.sourceField,
  //         'pattern': processor.pattern
  //       }
  //   });

  //   return body;
  // }

  // function buildBodySet(processor) {
  //   const body = buildBodyBase(processor);

  //   body.pipeline.processors.push({
  //       'set' : {
  //         'field' : processor.targetField,
  //         'value': processor.value
  //       }
  //   });

  //   return body;
  // }

  // function buildBodyAppend(processor) {
  //   const body = buildBodyBase(processor);

  //   body.pipeline.processors.push({
  //       'set' : {
  //         'field' : processor.targetField,
  //         'value': processor.values
  //       }
  //   });

  //   return body;
  // }

  // function buildBodyRename(processor) {
  //   const body = buildBodyBase(processor);

  //   body.pipeline.processors.push({
  //       'rename' : {
  //         'field' : processor.sourceField,
  //         'to': processor.targetField
  //       }
  //   });

  //   return body;
  // }

  // function buildBodyRemove(processor) {
  //   const body = buildBodyBase(processor);

  //   body.pipeline.processors.push({
  //       'remove' : {
  //         'field' : processor.sourceField
  //       }
  //   });

  //   return body;
  // }

  // function buildBodyLowercase(processor) {
  //   const body = buildBodyBase(processor);

  //   body.pipeline.processors.push({
  //       'lowercase' : {
  //         'field' : processor.sourceField
  //       }
  //   });

  //   return body;
  // }

  // function buildBodyUppercase(processor) {
  //   const body = buildBodyBase(processor);

  //   body.pipeline.processors.push({
  //       'uppercase' : {
  //         'field' : processor.sourceField
  //       }
  //   });

  //   return body;
  // }

  // function buildBodyTrim(processor) {
  //   const body = buildBodyBase(processor);

  //   body.pipeline.processors.push({
  //       'trim' : {
  //         'field' : processor.sourceField
  //       }
  //   });

  //   return body;
  // }

  // function buildBodySplit(processor) {
  //   const body = buildBodyBase(processor);

  //   body.pipeline.processors.push({
  //       'split' : {
  //         'field' : processor.sourceField,
  //         'separator' : processor.separator
  //       }
  //   });

  //   return body;
  // }

  // function buildBodyJoin(processor) {
  //   const body = buildBodyBase(processor);

  //   body.pipeline.processors.push({
  //       'join' : {
  //         'field' : processor.sourceField,
  //         'separator' : processor.separator
  //       }
  //   });

  //   return body;
  // }

  // function buildBodyConvert(processor) {
  //   const body = buildBodyBase(processor);

  //   body.pipeline.processors.push({
  //       'convert' : {
  //         'field' : processor.sourceField,
  //         'type' : processor.type
  //       }
  //   });

  //   return body;
  // }

  // function buildBodyGsub(processor) {
  //   const body = buildBodyBase(processor);

  //   body.pipeline.processors.push({
  //       'gsub' : {
  //         'field' : processor.sourceField,
  //         'pattern' : processor.pattern,
  //         'replacement' : processor.replacement
  //       }
  //   });

  //   return body;
  // }

  // function buildBodyDate(processor) {
  //   const body = buildBodyBase(processor);

  //   body.pipeline.processors.push({
  //       'date' : {
  //         'match_field' : processor.sourceField,
  //         'target_field' : processor.targetField,
  //         'match_formats' : processor.formats,
  //         'timezone': processor.timezone,
  //         'locale': processor.locale
  //       }
  //   });

  //   return body;
  // }

  // function buildBody(processor) {
  //   switch(processor.typeid) {
  //     case 'geoip':
  //       return buildBodyGeoIp(processor);
  //       break;
  //     case 'grok':
  //       return buildBodyGrok(processor);
  //       break;
  //     case 'set':
  //       return buildBodySet(processor);
  //       break;
  //     case 'append':
  //       return buildBodyAppend(processor);
  //       break;
  //     case 'rename':
  //       return buildBodyRename(processor);
  //       break;
  //     case 'remove':
  //       return buildBodyRemove(processor);
  //       break;
  //     case 'lowercase':
  //       return buildBodyLowercase(processor);
  //       break;
  //     case 'uppercase':
  //       return buildBodyUppercase(processor);
  //       break;
  //     case 'trim':
  //       return buildBodyTrim(processor);
  //       break;
  //     case 'split':
  //       return buildBodySplit(processor);
  //       break;
  //     case 'join':
  //       return buildBodyJoin(processor);
  //       break;
  //     case 'convert':
  //       return buildBodyConvert(processor);
  //       break;
  //     case 'gsub':
  //       return buildBodyGsub(processor);
  //       break;
  //     case 'date':
  //       return buildBodyDate(processor);
  //       break;
  //   }
  // }


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

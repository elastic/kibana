const _ = require('lodash');
const processorTypes = require('../domain/ingest_processor_types');

export default function ingestBuildRequest(pipeline) {
  const processors = pipeline.processors;
  const body = {
    'pipeline': {
      'processors': []
    },
    'docs': [
      {
        _source: pipeline.rootObject
      }
    ]
  };

  processors.forEach((processor) => {
    const processorType = _.find(processorTypes, { 'typeId': processor.typeId });
    const definition = processorType.getDefinition.call(processor);
    body.pipeline.processors.push(definition);
  });

  return body;
};

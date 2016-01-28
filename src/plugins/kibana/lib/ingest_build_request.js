const _ = require('lodash');
const processor_types = require('../domain/ingest_processor_types');

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
    const processor_type = _.find(processor_types, { 'typeId': processor.typeId });
    const definition = processor_type.getDefinition.call(processor);
    body.pipeline.processors.push(definition);
  });

  return body;
};

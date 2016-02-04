const _ = require('lodash');
const processorTypes = require('../../common/ingest_processor_types');

export default function ingestBuildRequest(pipeline) {
  const processors = pipeline.processors;
  const body = {
    'pipeline': {
      'processors': []
    },
    'docs': [
      {
        _source: pipeline.input
      }
    ]
  };

  processors.forEach((processor) => {
    const processorType = _.find(processorTypes, { 'typeId': processor.typeId });
    const definition = processorType.getDefinition(processor);
    body.pipeline.processors.push(definition);
  });

  return body;
};

import _ from 'lodash';

export default function convert(processorApiDocument) {
  const types = {
    //<kibana type>: <ingest type>,
    auto: 'auto',
    number: 'float',
    string: 'string',
    boolean: 'boolean'
  };

  const processor = {
    convert: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field,
      type: types[processorApiDocument.type]
    }
  };
  if (!_.isEmpty(processorApiDocument.target_field)) {
    processor.convert.target_field = processorApiDocument.target_field;
  }

  return processor;
}

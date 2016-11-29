import _ from 'lodash';

export default function geoip(processorApiDocument) {
  const processor = {
    geoip: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field
    }
  };
  if (!_.isEmpty(processorApiDocument.target_field)) {
    processor.geoip.target_field = processorApiDocument.target_field;
  }
  if (!_.isEmpty(processorApiDocument.database_file)) {
    processor.geoip.database_file = processorApiDocument.database_file;
  }
  if (!_.isEmpty(processorApiDocument.database_fields)) {
    processor.geoip.properties = processorApiDocument.database_fields;
  }

  return processor;
}

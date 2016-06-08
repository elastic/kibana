import _ from 'lodash';

export default {
  kibanaToEs: function (processorApiDocument) {
    const processor = {
      geoip: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field,
        ignore_failure: processorApiDocument.ignore_failure
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
  },
  esToKibana: function (processorEsDocument) {
    return {
      typeId: 'geoip',
      processor_id: processorEsDocument.tag,
      source_field: processorEsDocument.field,
      target_field: processorEsDocument.target_field,
      database_file: processorEsDocument.database_file,
      database_fields: processorEsDocument.properties,
      ignore_failure: processorEsDocument.ignore_failure
    };
  }
};

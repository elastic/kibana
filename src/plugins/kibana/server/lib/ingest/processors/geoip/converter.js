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
    if (!_.has(processorEsDocument, 'geoip')) {
      throw new Error('Elasticsearch processor document missing [geoip] property');
    }

    return {
      typeId: 'geoip',
      processor_id: processorEsDocument.geoip.tag,
      source_field: processorEsDocument.geoip.field,
      target_field: processorEsDocument.geoip.target_field,
      database_file: processorEsDocument.geoip.database_file,
      database_fields: processorEsDocument.geoip.properties,
      ignore_failure: processorEsDocument.geoip.ignore_failure
    };
  }
};

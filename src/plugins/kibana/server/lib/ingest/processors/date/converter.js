const _ = require('lodash');

export default {
  kibanaToEs: function (processorApiDocument) {
    const formats = [];
    processorApiDocument.formats.forEach((format) => {
      if (format.toUpperCase() === 'CUSTOM') {
        if (processorApiDocument.custom_format) {
          formats.push(processorApiDocument.custom_format);
        }
      } else {
        formats.push(format);
      }
    });

    return {
      date: {
        tag: processorApiDocument.processor_id,
        field: processorApiDocument.source_field,
        target_field: processorApiDocument.target_field,
        formats: formats,
        timezone: processorApiDocument.timezone,
        locale: processorApiDocument.locale,
        ignore_failure: processorApiDocument.ignore_failure
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    const standardFormats = ['ISO8601', 'UNIX', 'UNIX_MS', 'TAI64N'];

    const formats = [];
    let customFormat = '';
    _.forEach(processorEsDocument.formats, (format) => {
      if (_.contains(standardFormats, format.toUpperCase())) {
        formats.push(format.toUpperCase());
      } else {
        formats.push('CUSTOM');
        customFormat = format;
      }
    });

    return {
      typeId: 'date',
      processor_id: processorEsDocument.tag,
      source_field: processorEsDocument.field,
      target_field: processorEsDocument.target_field,
      formats: formats,
      custom_format: customFormat,
      timezone: processorEsDocument.timezone,
      locale: processorEsDocument.locale,
      ignore_failure: processorEsDocument.ignore_failure
    };
  }
};

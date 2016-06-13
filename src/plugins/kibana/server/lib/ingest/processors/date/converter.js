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
        locale: processorApiDocument.locale
      }
    };
  },
  esToKibana: function (processorEsDocument) {
    if (!_.has(processorEsDocument, 'date')) {
      throw new Error('Elasticsearch processor document missing [date] property');
    }

    const standardFormats = ['ISO8601', 'UNIX', 'UNIX_MS', 'TAI64N'];

    const formats = [];
    let customFormat = '';
    _.forEach(processorEsDocument.date.formats, (format) => {
      if (_.contains(standardFormats, format.toUpperCase())) {
        formats.push(format.toUpperCase());
      } else {
        formats.push('CUSTOM');
        customFormat = format;
      }
    });

    return {
      typeId: 'date',
      processor_id: processorEsDocument.date.tag,
      source_field: processorEsDocument.date.field,
      target_field: processorEsDocument.date.target_field,
      formats: _.uniq(formats),
      custom_format: customFormat,
      timezone: processorEsDocument.date.timezone,
      locale: processorEsDocument.date.locale
    };
  }
};

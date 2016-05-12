const _ = require('lodash');

export default function date(processorEsDocument) {
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
    locale: processorEsDocument.locale
  };
}

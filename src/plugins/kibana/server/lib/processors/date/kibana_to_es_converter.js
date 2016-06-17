export default function date(processorApiDocument) {
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
}

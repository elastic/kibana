export function append(processorApiDocument) {
  return {
    append: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.target_field,
      value: processorApiDocument.values
    }
  };
}

export function convert(processorApiDocument) {
  const types = {
    //<kibana type>: <ingest type>,
    auto: 'auto',
    number: 'float',
    string: 'string',
    boolean: 'boolean'
  };

  return {
    convert: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field,
      target_field: processorApiDocument.target_field,
      type: types[processorApiDocument.type]
    }
  };
}

export function date(processorApiDocument) {
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
      match_field: processorApiDocument.source_field,
      target_field: processorApiDocument.target_field,
      match_formats: formats,
      timezone: processorApiDocument.timezone,
      locale: processorApiDocument.locale
    }
  };
}

export function gsub(processorApiDocument) {
  return {
    gsub: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field,
      pattern: processorApiDocument.pattern,
      replacement: processorApiDocument.replacement
    }
  };
}

export function set(processorApiDocument) {
  return {
    set: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.target_field,
      value: processorApiDocument.value
    }
  };
}

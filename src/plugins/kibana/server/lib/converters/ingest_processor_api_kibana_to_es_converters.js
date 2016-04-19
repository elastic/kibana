import _ from 'lodash';

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

export function geoip(processorApiDocument) {
  const processor = {
    geoip: {
      tag: processorApiDocument.processor_id,
      source_field: processorApiDocument.source_field
    }
  };
  if (!_.isEmpty(processorApiDocument.target_field)) {
    processor.geoip.target_field = processorApiDocument.target_field;
  }
  if (!_.isEmpty(processorApiDocument.database_file)) {
    processor.geoip.database_file = processorApiDocument.database_file;
  }
  if (!_.isEmpty(processorApiDocument.database_fields)) {
    processor.geoip.fields = processorApiDocument.database_fields;
  }

  return processor;
}

export function grok(processorApiDocument) {
  return {
    grok: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field,
      pattern: processorApiDocument.pattern
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

export function join(processorApiDocument) {
  return {
    join: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field,
      separator: processorApiDocument.separator
    }
  };
}

export function lowercase(processorApiDocument) {
  return {
    lowercase: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field
    }
  };
}

export function remove(processorApiDocument) {
  return {
    remove: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field
    }
  };
}

export function rename(processorApiDocument) {
  return {
    rename: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field,
      to: processorApiDocument.target_field
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

export function split(processorApiDocument) {
  return {
    split: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field,
      separator: processorApiDocument.separator
    }
  };
}

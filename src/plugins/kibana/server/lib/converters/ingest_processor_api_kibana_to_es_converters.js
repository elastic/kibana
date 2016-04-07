export function append(processorApiDocument) {
  return {
    append: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.target_field,
      value: processorApiDocument.values
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

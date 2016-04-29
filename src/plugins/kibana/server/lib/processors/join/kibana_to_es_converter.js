export default function join(processorApiDocument) {
  return {
    join: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field,
      separator: processorApiDocument.separator
    }
  };
}

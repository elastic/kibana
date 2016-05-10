export default function rename(processorApiDocument) {
  return {
    rename: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field,
      target_field: processorApiDocument.target_field
    }
  };
}

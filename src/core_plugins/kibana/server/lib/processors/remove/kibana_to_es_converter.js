export default function remove(processorApiDocument) {
  return {
    remove: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field
    }
  };
}

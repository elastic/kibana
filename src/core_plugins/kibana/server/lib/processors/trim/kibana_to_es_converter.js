export default function trim(processorApiDocument) {
  return {
    trim: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field
    }
  };
}

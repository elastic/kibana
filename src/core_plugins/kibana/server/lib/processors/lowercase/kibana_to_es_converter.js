export default function lowercase(processorApiDocument) {
  return {
    lowercase: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field
    }
  };
}

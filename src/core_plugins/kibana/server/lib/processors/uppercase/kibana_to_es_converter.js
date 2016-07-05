export default function uppercase(processorApiDocument) {
  return {
    uppercase: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field
    }
  };
}

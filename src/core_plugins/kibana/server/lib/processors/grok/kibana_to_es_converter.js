export default function grok(processorApiDocument) {
  return {
    grok: {
      tag: processorApiDocument.processor_id,
      field: processorApiDocument.source_field,
      patterns: [ processorApiDocument.pattern ]
    }
  };
}

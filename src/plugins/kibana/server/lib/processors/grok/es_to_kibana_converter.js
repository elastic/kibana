export default function grok(processorEsDocument) {
  return {
    typeId: 'grok',
    processor_id: processorEsDocument.tag,
    source_field: processorEsDocument.field,
    pattern: processorEsDocument.pattern
  };
}

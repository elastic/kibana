export default function gsub(processorEsDocument) {
  return {
    typeId: 'gsub',
    processor_id: processorEsDocument.tag,
    source_field: processorEsDocument.field,
    pattern: processorEsDocument.pattern,
    replacement: processorEsDocument.replacement
  };
}

export default function rename(processorEsDocument) {
  return {
    typeId: 'rename',
    processor_id: processorEsDocument.tag,
    source_field: processorEsDocument.field,
    target_field: processorEsDocument.target_field
  };
}

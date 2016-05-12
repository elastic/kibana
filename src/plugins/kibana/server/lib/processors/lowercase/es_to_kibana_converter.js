export default function lowercase(processorEsDocument) {
  return {
    typeId: 'lowercase',
    processor_id: processorEsDocument.tag,
    source_field: processorEsDocument.field
  };
}

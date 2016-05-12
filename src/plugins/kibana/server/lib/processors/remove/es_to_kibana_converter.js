export default function remove(processorEsDocument) {
  return {
    typeId: 'remove',
    processor_id: processorEsDocument.tag,
    source_field: processorEsDocument.field
  };
}

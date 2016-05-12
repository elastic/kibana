export default function trim(processorEsDocument) {
  return {
    typeId: 'trim',
    processor_id: processorEsDocument.tag,
    source_field: processorEsDocument.field
  };
}

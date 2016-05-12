export default function join(processorEsDocument) {
  return {
    typeId: 'join',
    processor_id: processorEsDocument.tag,
    source_field: processorEsDocument.field,
    separator: processorEsDocument.separator
  };
}

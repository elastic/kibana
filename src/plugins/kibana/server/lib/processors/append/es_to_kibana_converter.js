export default function append(processorEsDocument) {
  return {
    typeId: 'append',
    processor_id: processorEsDocument.tag,
    target_field: processorEsDocument.field,
    values: processorEsDocument.value
  };
}

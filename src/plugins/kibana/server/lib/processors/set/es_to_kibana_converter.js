export default function set(processorEsDocument) {
  return {
    typeId: 'set',
    processor_id: processorEsDocument.tag,
    target_field: processorEsDocument.field,
    value: processorEsDocument.value
  };
}

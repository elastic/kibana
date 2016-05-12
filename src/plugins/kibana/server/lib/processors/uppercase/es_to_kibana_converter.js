export default function uppercase(processorEsDocument) {
  return {
    typeId: 'uppercase',
    processor_id: processorEsDocument.tag,
    source_field: processorEsDocument.field
  };
}

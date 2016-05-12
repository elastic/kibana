export default function split(processorEsDocument) {
  return {
    typeId: 'split',
    processor_id: processorEsDocument.tag,
    source_field: processorEsDocument.field,
    separator: processorEsDocument.separator
  };
}

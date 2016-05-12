export default function convert(processorEsDocument) {
  const types = {
    //<ingest type>: <kibana type>
    auto: 'auto',
    float: 'number',
    string: 'string',
    boolean: 'boolean'
  };

  return {
    typeId: 'convert',
    processor_id: processorEsDocument.tag,
    source_field: processorEsDocument.field,
    target_field: processorEsDocument.target_field,
    type: types[processorEsDocument.type]
  };
}

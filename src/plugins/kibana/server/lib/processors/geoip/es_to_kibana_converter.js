export default function geoip(processorEsDocument) {
  return {
    typeId: 'geoip',
    processor_id: processorEsDocument.tag,
    source_field: processorEsDocument.field,
    target_field: processorEsDocument.target_field,
    database_file: processorEsDocument.database_file,
    database_fields: processorEsDocument.properties
  };
}

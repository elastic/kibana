import { assign, get, keys, omit } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const unknownTypeId = get(processorApiDocument, 'unknown_type_id');
      const result = baseConverter.kibanaToEs(processorApiDocument, unknownTypeId);
      const innerObject = get(result, unknownTypeId);

      assign(innerObject, get(processorApiDocument, 'json'));

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const unknownTypeId = keys(processorEsDocument)[0];
      const result = baseConverter.esToKibana(processorEsDocument, unknownTypeId);
      const processor = get(processorEsDocument, unknownTypeId);
      const json = omit(processor, ['tag', 'on_failure']);

      assign(result, {
        type_id: 'unknown',
        unknown_type_id: unknownTypeId,
        json: json
      });

      return result;
    }
  };
}

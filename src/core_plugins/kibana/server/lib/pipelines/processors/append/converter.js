import { assign } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'append');
      assign(result.append, {
        field: processorApiDocument.target_field,
        value: processorApiDocument.values
      });

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'append');

      assign(result, {
        target_field: processorEsDocument.append.field,
        values: processorEsDocument.append.value
      });

      return result;
    }
  };
}

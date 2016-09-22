import { assign, isEmpty } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'lowercase');
      assign(result.lowercase, {
        field: processorApiDocument.source_field
      });

      if (!isEmpty(processorApiDocument.ignore_missing)) {
        assign(result.lowercase, {
          ignore_missing: processorApiDocument.ignore_missing
        });
      }

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'lowercase');

      assign(result, {
        source_field: processorEsDocument.lowercase.field
      });

      if (!isEmpty(processorEsDocument.lowercase.ignore_missing)) {
        assign(result, {
          ignore_missing: processorEsDocument.lowercase.ignore_missing
        });
      }

      return result;
    }
  };
}

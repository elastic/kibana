import { assign, isEmpty } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'uppercase');
      assign(result.uppercase, {
        field: processorApiDocument.source_field
      });

      if (!isEmpty(processorApiDocument.ignore_missing)) {
        assign(result.uppercase, {
          ignore_missing: processorApiDocument.ignore_missing
        });
      }

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'uppercase');

      assign(result, {
        source_field: processorEsDocument.uppercase.field
      });

      if (!isEmpty(processorEsDocument.uppercase.ignore_missing)) {
        assign(result, {
          ignore_missing: processorEsDocument.uppercase.ignore_missing
        });
      }

      return result;
    }
  };
}

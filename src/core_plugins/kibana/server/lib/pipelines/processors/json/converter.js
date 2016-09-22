import { assign, isEmpty } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'json');
      assign(result.json, {
        field: processorApiDocument.source_field
      });

      if (!isEmpty(processorApiDocument.target_field)) {
        assign(result.json, {
          target_field: processorApiDocument.target_field
        });
      }

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'json');

      assign(result, {
        source_field: processorEsDocument.json.field
      });

      if (!isEmpty(processorEsDocument.json.target_field)) {
        assign(result, {
          target_field: processorEsDocument.json.target_field
        });
      }

      return result;
    }
  };
}

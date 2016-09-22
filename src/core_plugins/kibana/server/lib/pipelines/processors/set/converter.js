import { assign, isEmpty } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'set');
      assign(result.set, {
        field: processorApiDocument.target_field,
        value: processorApiDocument.value
      });

      if (!isEmpty(processorApiDocument.override)) {
        assign(result.set, {
          override: processorApiDocument.override
        });
      }

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'set');

      assign(result, {
        target_field: processorEsDocument.set.field,
        value: processorEsDocument.set.value
      });

      if (!isEmpty(processorEsDocument.set.override)) {
        assign(result, {
          override: processorEsDocument.set.override
        });
      }

      return result;
    }
  };
}

import { assign, isEmpty } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'dot_expander');
      assign(result.dot_expander, {
        field: processorApiDocument.source_field
      });

      if (!isEmpty(processorApiDocument.path)) {
        assign(result.dot_expander, {
          path: processorApiDocument.path
        });
      }

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'dot_expander');

      assign(result, {
        source_field: processorEsDocument.dot_expander.field
      });

      if (!isEmpty(processorEsDocument.dot_expander.path)) {
        assign(result, {
          path: processorEsDocument.dot_expander.path
        });
      }

      return result;
    }
  };
}

import { assign } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'split');
      assign(result.split, {
        field: processorApiDocument.source_field,
        separator: processorApiDocument.separator
      });

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'split');

      assign(result, {
        source_field: processorEsDocument.split.field,
        separator: processorEsDocument.split.separator
      });

      return result;
    }
  };
}

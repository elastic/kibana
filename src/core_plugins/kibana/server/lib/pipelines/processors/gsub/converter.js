import { assign } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'gsub');
      assign(result.gsub, {
        field: processorApiDocument.source_field,
        pattern: processorApiDocument.pattern,
        replacement: processorApiDocument.replacement
      });

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'gsub');

      assign(result, {
        source_field: processorEsDocument.gsub.field,
        pattern: processorEsDocument.gsub.pattern,
        replacement: processorEsDocument.gsub.replacement
      });

      return result;
    }
  };
}

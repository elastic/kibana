import { assign, isEmpty } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'rename');
      assign(result.rename, {
        field: processorApiDocument.source_field,
        target_field: processorApiDocument.target_field
      });

      if (!isEmpty(processorApiDocument.ignore_missing)) {
        assign(result.rename, {
          ignore_missing: processorApiDocument.ignore_missing
        });
      }

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'rename');

      assign(result, {
        source_field: processorEsDocument.rename.field,
        target_field: processorEsDocument.rename.target_field
      });

      if (!isEmpty(processorEsDocument.rename.ignore_missing)) {
        assign(result, {
          ignore_missing: processorEsDocument.rename.ignore_missing
        });
      }

      return result;
    }
  };
}

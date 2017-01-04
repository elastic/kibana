import { assign, isEmpty } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'sort');
      assign(result.sort, {
        field: processorApiDocument.target_field
      });

      if (!isEmpty(processorApiDocument.sort_order)) {
        assign(result.sort, {
          order: processorApiDocument.sort_order
        });
      }

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'sort');

      assign(result, {
        target_field: processorEsDocument.sort.field
      });

      if (!isEmpty(processorEsDocument.sort.order)) {
        assign(result, {
          sort_order: processorEsDocument.sort.order
        });
      }

      return result;
    }
  };
}

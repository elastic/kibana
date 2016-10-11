import { assign, isEmpty } from 'lodash';

export default function (server) {
  return {
    kibanaToEs: function (processorApiDocument) {
      const result = {};

      assign(result, {
        doc: processorApiDocument.doc
      });

      if (!isEmpty(processorApiDocument.description)) {
        assign(result, {
          description: processorApiDocument.description
        });
      }

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = {};

      assign(result, {
        doc: processorEsDocument.doc
      });

      if (!isEmpty(processorEsDocument.description)) {
        assign(result, {
          description: processorEsDocument.description
        });
      }

      return result;
    }
  };
}

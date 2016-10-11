import { assign, isEmpty } from 'lodash';

export default function (server) {
  return {
    kibanaToEs: function (sampleApiDocument) {
      const result = {};

      assign(result, {
        doc: sampleApiDocument.doc
      });

      if (!isEmpty(sampleApiDocument.description)) {
        assign(result, {
          description: sampleApiDocument.description
        });
      }

      return result;
    },
    esToKibana: function (sampleEsDocument) {
      const result = {};

      assign(result, {
        doc: sampleEsDocument.doc
      });

      if (!isEmpty(sampleEsDocument.description)) {
        assign(result, {
          description: sampleEsDocument.description
        });
      }

      return result;
    }
  };
}

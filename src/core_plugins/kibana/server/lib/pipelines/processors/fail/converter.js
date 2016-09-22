import { assign } from 'lodash';

export default function (server) {
  const baseConverter = server.plugins.kibana.pipelines.processors.baseConverter;

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = baseConverter.kibanaToEs(processorApiDocument, 'fail');
      assign(result.fail, {
        message: processorApiDocument.message
      });

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = baseConverter.esToKibana(processorEsDocument, 'fail');

      assign(result, {
        message: processorEsDocument.fail.message
      });

      return result;
    }
  };
}

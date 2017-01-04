import { map, keys } from 'lodash';

export default function (server) {
  return {
    kibanaToEs: function (processorApiDocument) {
      const pipelinesManager = server.plugins.kibana.pipelines;

      const result = map(processorApiDocument, (processor) => {
        const typeId = processor.type_id;

        let processorConverter = pipelinesManager.processors.converters[typeId];
        if (!processorConverter) {
          const errorMessage = `Unknown processor type: [${typeId}]`;
          throw new Error(errorMessage);
        }

        return processorConverter.kibanaToEs(processor);
      });

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const pipelinesManager = server.plugins.kibana.pipelines;

      const result = map(processorEsDocument, (processor) => {
        const typeId = keys(processor)[0];

        let processorConverter = pipelinesManager.processors.converters[typeId];
        if (!processorConverter) {
          throw new Error(`Unknown processor type: [${typeId}]`);
        }

        return processorConverter.esToKibana(processor);
      });

      return result;
    }
  };
}

import { map } from 'lodash';
import sampleConverterProvider from '../sample/converter';

export default function (server) {
  const sampleConverter = sampleConverterProvider(server);

  return {
    kibanaToEs: function (processorApiDocument) {
      const result = map(processorApiDocument, (sample) => {
        return sampleConverter.kibanaToEs(sample);
      });

      return result;
    },
    esToKibana: function (processorEsDocument) {
      const result = map(processorEsDocument, (sample) => {
        return sampleConverter.esToKibana(sample);
      });

      return result;
    }
  };
}

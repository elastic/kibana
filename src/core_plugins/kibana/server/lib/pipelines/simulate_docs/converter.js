import { map } from 'lodash';

export default function (server) {
  return {
    kibanaToEs: function (pipelineApiDocument) {
      const result = map(pipelineApiDocument.samples, (sample) => {
        return {
          _source: sample.doc
        };
      });

      return result;
    }
  };
}

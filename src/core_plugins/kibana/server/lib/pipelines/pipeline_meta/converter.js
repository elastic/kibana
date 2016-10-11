import { assign, isEmpty } from 'lodash';

export default function (server) {
  return {
    kibanaToEs: function (pipelineApiDocument) {
      const result = {
        samples: pipelineApiDocument.samples
      };

      return result;
    },
    esToKibana: function (pipelineEsDocument) {
      // const result = {};

      // assign(result, {
      //   doc: pipelineEsDocument.doc
      // });

      // if (!isEmpty(pipelineEsDocument.description)) {
      //   assign(result, {
      //     description: pipelineEsDocument.description
      //   });
      // }

      // return result;
    }
  };
}


// export default Joi.object({
//   doc: Joi.object().required(),
//   description: Joi.string().allow('')
// });

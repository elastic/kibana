import Joi from 'joi';

export const createInstallRoute = () => ({
  path: '/api/sample_data/{id}',
  method: 'POST',
  config: {
    validate: {
      params: Joi.object().keys({
        id: Joi.string().required(),
      }).required()
    },
    handler(request, reply) {
      const sampleDataSet = request.server.getSampleDataSets().find(sampleDataSet => {
        return sampleDataSet.id === request.params.id;
      });

      if (!sampleDataSet) {
        reply().code(404);
        return;
      }

      reply();
    }
  }
});

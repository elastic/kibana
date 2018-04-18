import Joi from 'joi';

import { loadData } from './lib/load_data';

function updateRow(row) {
  return row;
}

export const createInstallRoute = () => ({
  path: '/api/sample_data/{id}',
  method: 'GET', // TODO change to POST but GET is easier to test because it works in browser
  config: {
    validate: {
      params: Joi.object().keys({
        id: Joi.string().required(),
      }).required()
    },
    handler: (request, reply) => {
      const sampleDataSet = request.server.getSampleDataSets().find(sampleDataSet => {
        return sampleDataSet.id === request.params.id;
      });

      if (!sampleDataSet) {
        reply().code(404);
        return;
      }

      const index = sampleDataSet.id;

      loadData(sampleDataSet.dataPath, index, updateRow, (count) => {
        reply({ count });
      });
    }
  }
});

import Joi from 'joi';
import { dataSetSchema } from './data_set_schema';
import {
  createListRoute,
  createInstallRoute,
  createUninstallRoute,
} from './routes';
import {
  flightsSpecProvider,
} from './data_sets';

export function sampleDataMixin(kbnServer, server) {
  server.route(createListRoute());
  server.route(createInstallRoute());
  server.route(createUninstallRoute());

  const sampleDataSets = [];

  server.decorate('server', 'getSampleDataSets', () => {
    return sampleDataSets;
  });

  server.decorate('server', 'registerSampleDataSet', (specProvider) => {
    const { error, value } = Joi.validate(specProvider(server), dataSetSchema);

    if (error) {
      throw new Error(`Unable to register data set spec because its invalid. ${error}`);
    }

    sampleDataSets.push(value);
  });

  server.registerSampleDataSet(flightsSpecProvider);
}

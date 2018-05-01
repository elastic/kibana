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
      throw new Error(`Unable to register sample data set spec because its invalid. ${error}`);
    }

    const defaultIndexSavedObjectJson = value.savedObjects.find(savedObjectJson => {
      return savedObjectJson.type === 'index-pattern' && savedObjectJson.id === value.defaultIndex;
    });
    if (!defaultIndexSavedObjectJson) {
      throw new Error(
        `Unable to register sample data set spec, defaultIndex: "${value.defaultIndex}" does not exist in savedObjects list.`);
    }

    const dashboardSavedObjectJson = value.savedObjects.find(savedObjectJson => {
      return savedObjectJson.type === 'dashboard' && savedObjectJson.id === value.overviewDashboard;
    });
    if (!dashboardSavedObjectJson) {
      throw new Error(
        `Unable to register sample data set spec, overviewDashboard: "${value.overviewDashboard}" does not exist in savedObjects list.`);
    }

    sampleDataSets.push(value);
  });

  server.registerSampleDataSet(flightsSpecProvider);
}

import {
  setupScenarioManager,
  setupKibanaServer,
  createScopedSuperTest
} from '../../__test_helpers__';

import post from './_post';
import del from './_del';
import data from './_data';
import simulate from './_simulate';
import processors from './_processors';
import processorTypes from './processors/index';

describe('ingest API', function () {
  const {
    startServer,
    stopServer
  } = setupKibanaServer();
  before(startServer);
  after(stopServer);

  const {
    scenarioManager,
    loadScenario,
    unloadScenario
  } = setupScenarioManager('emptyKibana');
  before(loadScenario);
  after(unloadScenario);

  const request = createScopedSuperTest();

  post(scenarioManager, request);
  del(scenarioManager, request);
  data(scenarioManager, request);
  simulate(scenarioManager, request);
  processors(scenarioManager, request);
  processorTypes(scenarioManager, request);
});

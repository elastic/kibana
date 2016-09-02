import {
  setupScenarioManager,
  setupKibanaServer,
  createScopedSuperTest
} from '../../__test_helpers__';

import count from './_count';

describe('search API', function () {
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

  count(scenarioManager, request);
});

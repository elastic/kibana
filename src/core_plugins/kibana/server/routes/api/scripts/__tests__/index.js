import {
  setupKibanaServer,
  createScopedSuperTest
} from '../../__test_helpers__';

import languages from './_languages';

describe('scripts API', function () {
  const {
    startServer,
    stopServer
  } = setupKibanaServer();
  before(startServer);
  after(stopServer);

  const request = createScopedSuperTest();
  languages(request);
});

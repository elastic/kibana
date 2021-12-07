/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setupEnvironment } from '../helpers';
import { AppTestBed, setupAppPage } from './editor.helpers';

describe('Console - Legacy Editor', () => {
  let testBed: AppTestBed;
  let server: ReturnType<typeof setupEnvironment>['server'];
  let httpRequestsMockHelpers: ReturnType<typeof setupEnvironment>['httpRequestsMockHelpers'];

  beforeEach(() => {
    ({ server, httpRequestsMockHelpers } = setupEnvironment());
  });

  afterEach(() => {
    server.restore();
  });

  describe('send request', () => {
    beforeEach(async () => {
      testBed = await setupAppPage();
    });

    test('sends current request to ES', async () => {
      const { actions } = testBed;

      httpRequestsMockHelpers.setConsoleRequestResponse({
        fake_response: true,
      });

      await actions.clickSendRequestButton();

      // const editor = find('response-editor');
      // console.log(find('statusCode').text());
    });
  });
});

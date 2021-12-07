/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setupEnvironment } from '../helpers';
import { EditorTestBed, setupEditorPage } from './editor.helpers';

describe('Console - Legacy Editor', () => {
  let testBed: EditorTestBed;
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
      testBed = await setupEditorPage({ initialTextValue: '' });
    });

    test('sends current request to ES', async () => {
      const { exists, actions } = testBed;

      await actions.clickSendRequestButton();
      // expect(exists('sampleTest')).toBe(true);
      // (getEndpointFromPosition as jest.Mock).mockReturnValue({ patterns: [] });
      // (sendRequestToES as jest.Mock).mockRejectedValue({});
      // const editor = doMount();
      // act(() => {
      // editor.find('button[data-test-subj~="sendRequestButton"]').simulate('click');
      // });
      // await nextTick();
      // expect(sendRequestToES).toBeCalledTimes(1);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { act } from 'react-dom/test-utils';
import { setupEnvironment } from '../helpers';
import { AppTestBed, setupAppPage } from './editor.helpers';
import {
  getDocumentation,
  autoIndent,
} from '../../../public/application/containers/editor/legacy/console_menu_actions';

jest.mock('../../../public/application/contexts/request_context.tsx', () => ({
  ...jest.requireActual('../../../public/application/contexts/request_context.tsx'),
  useRequestReadContext: () => ({
    requestInFlight: false,
    lastResult: {
      data: [
        {
          response: {
            statusCode: 200,
            statusText: 'OK',
            value: 'wow',
          },
          request: {
            method: 'GET',
            path: '/.security',
          },
        },
      ],
    },
  }),
}));

jest.mock('../../../public/application/containers/editor/legacy/console_menu_actions.ts', () => {
  return {
    getDocumentation: jest.fn(),
    autoIndent: jest.fn(),
  };
});

describe('Console - Legacy Editor', () => {
  let testBed: AppTestBed;
  let server: ReturnType<typeof setupEnvironment>['server'];

  beforeEach(() => {
    ({ server } = setupEnvironment());
  });

  afterEach(() => {
    server.restore();
  });

  describe('send request', () => {
    beforeEach(async () => {
      testBed = await setupAppPage();
    });

    test('sends current request to ES', async () => {
      const { find, actions } = testBed;

      await actions.clickSendRequestButton();

      // Using a simple matcher like `200 - OK` wont work since the component
      // renders the white space as &nbsp;. So we need to use the unix code
      // equivalent of it `\u00a0` in order to make it work.
      expect(find('statusCode').text()).toBe('200\u00a0-\u00a0OK');
    });
  });

  describe('Request options dropdown', () => {
    it('opens docs', async () => {
      const { find, component, actions } = testBed;
      await actions.openRequestOptionsDropdown();

      await act(async () => {
        find('contextMenuPanel.consoleMenuOpenDocs').simulate('click');
      });
      component.update();

      expect(getDocumentation).toHaveBeenCalledTimes(1);
    });

    it('prompts auto-indent', async () => {
      const { find, component, actions } = testBed;
      await actions.openRequestOptionsDropdown();

      await act(async () => {
        find('contextMenuPanel.consoleMenuAutoIndent').simulate('click');
      });
      component.update();

      expect(autoIndent).toHaveBeenCalledTimes(1);
    });
  });
});

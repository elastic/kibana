/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../../../../../lib/utils', () => ({ replaceVariables: jest.fn() }));

import './editor.test.mock';

import React from 'react';
import { mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n-react';
import { act } from 'react-dom/test-utils';
import * as sinon from 'sinon';

import { serviceContextMock } from '../../../../contexts/services_context.mock';

import { nextTick } from '@kbn/test-jest-helpers';
import {
  ServicesContextProvider,
  EditorContextProvider,
  RequestContextProvider,
  ContextValue,
} from '../../../../contexts';

// Mocked functions
import { sendRequest } from '../../../../hooks/use_send_current_request/send_request';
import { getEndpointFromPosition } from '../../../../../lib/autocomplete/get_endpoint_from_position';
import type { DevToolsSettings } from '../../../../../services';
import * as consoleMenuActions from '../console_menu_actions';
import { Editor } from './editor';
import * as utils from '../../../../../lib/utils';

describe('Legacy (Ace) Console Editor Component Smoke Test', () => {
  let mockedAppContextValue: ContextValue;
  const sandbox = sinon.createSandbox();

  const doMount = () =>
    mount(
      <I18nProvider>
        <ServicesContextProvider value={mockedAppContextValue}>
          <RequestContextProvider>
            <EditorContextProvider settings={{} as unknown as DevToolsSettings}>
              <Editor initialTextValue="" setEditorInstance={() => {}} />
            </EditorContextProvider>
          </RequestContextProvider>
        </ServicesContextProvider>
      </I18nProvider>
    );

  beforeEach(() => {
    document.queryCommandSupported = sinon.fake(() => true);
    mockedAppContextValue = serviceContextMock.create();
    (utils.replaceVariables as jest.Mock).mockReturnValue(['test']);
  });

  afterEach(() => {
    jest.clearAllMocks();
    sandbox.restore();
  });

  it('calls send current request', async () => {
    (getEndpointFromPosition as jest.Mock).mockReturnValue({ patterns: [] });
    (sendRequest as jest.Mock).mockRejectedValue({});
    const editor = doMount();
    act(() => {
      editor.find('button[data-test-subj~="sendRequestButton"]').simulate('click');
    });
    await nextTick();
    expect(sendRequest).toBeCalledTimes(1);
  });

  it('opens docs', () => {
    const stub = sandbox.stub(consoleMenuActions, 'getDocumentation');
    const editor = doMount();
    const consoleMenuToggle = editor.find('[data-test-subj~="toggleConsoleMenu"]').last();
    consoleMenuToggle.simulate('click');

    const docsButton = editor.find('[data-test-subj~="consoleMenuOpenDocs"]').last();
    docsButton.simulate('click');

    expect(stub.callCount).toBe(1);
  });

  it('prompts auto-indent', () => {
    const stub = sandbox.stub(consoleMenuActions, 'autoIndent');
    const editor = doMount();
    const consoleMenuToggle = editor.find('[data-test-subj~="toggleConsoleMenu"]').last();
    consoleMenuToggle.simulate('click');

    const autoIndentButton = editor.find('[data-test-subj~="consoleMenuAutoIndent"]').last();
    autoIndentButton.simulate('click');

    expect(stub.callCount).toBe(1);
  });
});

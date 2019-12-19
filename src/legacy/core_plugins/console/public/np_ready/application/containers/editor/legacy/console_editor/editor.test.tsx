/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import './editor.test.mock';

import React from 'react';
import { mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n/react';
import { act } from 'react-dom/test-utils';
import * as sinon from 'sinon';

import { notificationServiceMock } from '../../../../../../../../../../../src/core/public/mocks';

import { nextTick } from 'test_utils/enzyme_helpers';
import {
  ServicesContextProvider,
  EditorContextProvider,
  RequestContextProvider,
} from '../../../../contexts';

import { sendRequestToES } from '../../../../hooks/use_send_current_request_to_es/send_request_to_es';
import * as consoleMenuActions from '../console_menu_actions';
import { Editor } from './editor';

describe('Legacy (Ace) Console Editor Component Smoke Test', () => {
  let mockedAppContextValue: any;
  const sandbox = sinon.createSandbox();

  const doMount = () =>
    mount(
      <I18nProvider>
        <ServicesContextProvider value={mockedAppContextValue}>
          <RequestContextProvider>
            <EditorContextProvider settings={{} as any}>
              <Editor />
            </EditorContextProvider>
          </RequestContextProvider>
        </ServicesContextProvider>
      </I18nProvider>
    );

  beforeEach(() => {
    document.queryCommandSupported = sinon.fake(() => true);
    mockedAppContextValue = {
      services: {
        history: {
          getSavedEditorState: () => null,
          updateCurrentState: jest.fn(),
        },
        notifications: notificationServiceMock.createSetupContract(),
      },
      docLinkVersion: 'NA',
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('calls send current request to ES', async () => {
    (sendRequestToES as jest.Mock).mockRejectedValue({});
    const editor = doMount();
    act(() => {
      editor.find('[data-test-subj~="sendRequestButton"]').simulate('click');
    });
    await nextTick();
    expect(sendRequestToES).toBeCalledTimes(1);
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

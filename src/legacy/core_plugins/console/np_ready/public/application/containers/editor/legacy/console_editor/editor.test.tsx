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

import React from 'react';
import { ReactWrapper, mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n/react';
import * as sinon from 'sinon';

import { EditorContextProvider } from '../../context';
import { AppContextProvider } from '../../../../context';
import { Editor } from './editor';

jest.mock('../../../../components/editor_example.tsx', () => {});
jest.mock('../../../../../../../public/quarantined/src/mappings.js', () => ({
  retrieveAutoCompleteInfo: () => {},
}));
jest.mock('../../../../../../../public/quarantined/src/input.ts', () => {
  return {
    initializeEditor: () => ({
      $el: {
        css: () => {},
      },
      focus: () => {},
      update: () => {},
      getSession: () => ({ on: () => {}, setUseWrapMode: () => {} }),
      commands: {
        addCommand: () => {},
      },
    }),
  };
});

import * as sendRequestModule from './send_current_request_to_es';
import * as consoleMenuActions from '../console_menu_actions';

describe('Legacy (Ace) Console Editor Component Smoke Test', () => {
  let mockedAppContextValue: any;
  let editor: ReactWrapper;

  beforeEach(() => {
    document.queryCommandSupported = sinon.fake(() => true);
    mockedAppContextValue = {
      services: {
        history: {
          getSavedEditorState: () => null,
          updateCurrentState: () => {},
        },
      },
      // eslint-disable-next-line
      ResizeChecker: function() {
        return { on: () => {} };
      },
      docLinkVersion: 'NA',
    };
    editor = mount(
      <I18nProvider>
        <AppContextProvider value={mockedAppContextValue}>
          <EditorContextProvider settings={{} as any}>
            <Editor />
          </EditorContextProvider>
        </AppContextProvider>
      </I18nProvider>
    );
  });

  it('calls send current request to ES', () => {
    const stub = sinon.stub(sendRequestModule, 'sendCurrentRequestToES');
    try {
      editor.find('[data-test-subj~="sendRequestButton"]').simulate('click');
      expect(stub.called).toBe(true);
      expect(stub.callCount).toBe(1);
    } finally {
      stub.restore();
    }
  });

  it('opens docs', () => {
    const stub = sinon.stub(consoleMenuActions, 'getDocumentation');
    try {
      const consoleMenuToggle = editor.find('[data-test-subj~="toggleConsoleMenu"]').last();
      consoleMenuToggle.simulate('click');

      const docsButton = editor.find('[data-test-subj~="consoleMenuOpenDocs"]').last();
      docsButton.simulate('click');

      expect(stub.called).toBe(true);
      expect(stub.callCount).toBe(1);
    } finally {
      stub.restore();
    }
  });

  it('prompts auto-indent', () => {
    const stub = sinon.stub(consoleMenuActions, 'autoIndent');
    try {
      const consoleMenuToggle = editor.find('[data-test-subj~="toggleConsoleMenu"]').last();
      consoleMenuToggle.simulate('click');

      const autoIndentButton = editor.find('[data-test-subj~="consoleMenuAutoIndent"]').last();
      autoIndentButton.simulate('click');

      expect(stub.called).toBe(true);
      expect(stub.callCount).toBe(1);
    } finally {
      stub.restore();
    }
  });
});

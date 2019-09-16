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
import { mount } from 'enzyme';
import * as sinon from 'sinon';
import { EditorContextProvider } from '../../../context';
import { AppContextProvider } from '../../../../../context';

import { Editor } from '../editor';

jest.mock('../../../../../components/editor_example.tsx', () => {});
jest.mock('../../../../../../../../public/quarantined/src/mappings.js', () => ({
  retrieveAutoCompleteInfo: () => {},
}));
jest.mock('../../../../../../../../public/quarantined/src/input.js', () => {
  return {
    initializeInput: () => ({
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

import * as sendRequestModule from '../send_current_request_to_es';

describe('Legacy (Ace) Console Editor', () => {
  let mockedAppContextValue: any;

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
  });

  it('can send requests when prompted via the UI', () => {
    const stub = sinon.stub(sendRequestModule, 'sendCurrentRequestToES');
    const wrapped = mount(
      <AppContextProvider value={mockedAppContextValue}>
        <EditorContextProvider settings={{} as any}>
          <Editor />
        </EditorContextProvider>
      </AppContextProvider>
    );
    wrapped.find('[data-test-subj~="send-request-button"]').simulate('click');
    expect(stub.called).toBe(true);
    stub.restore();
  });
});

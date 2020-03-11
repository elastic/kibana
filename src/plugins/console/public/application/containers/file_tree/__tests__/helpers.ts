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

import { act } from 'react-dom/test-utils';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import { ReactWrapper } from 'enzyme';

export const createHelpers = (component: ReactWrapper) => {
  const publicAPI = {
    createTestFile: async () => {
      (findTestSubject(component, 'consoleCreateFileButton') as ReactWrapper).simulate('click');
      const textInput = component.find('.conAppFileNameTextField').last();
      textInput.simulate('change', { target: { value: 'test' } });
      await act(async () => {
        component.find('form').simulate('submit');
      });
    },

    editFile: async (oldName: string, newName: string) => {
      (findTestSubject(component, `consoleEditFileButton-${oldName}`) as ReactWrapper).simulate(
        'click'
      );
      const textInput = component.find('.conApp__fileTree__entry__nameInput').last();
      textInput.simulate('change', { target: { value: newName } });
      await act(async () => {
        textInput.simulate('blur');
      });
    },

    deleteFile: async (name: string) => {
      (findTestSubject(component, `consoleDeleteFileButton-${name}`) as ReactWrapper).simulate(
        'click'
      );
      await act(async () => {
        (findTestSubject(
          component,
          `consoleModalDeleteFileButton-${name}`
        ) as ReactWrapper).simulate('click');
      });
    },

    getFileEntry: (name: string) => findTestSubject(component, `consoleFileNameLabel-${name}`),

    fileEntryExists: (name: string) => publicAPI.getFileEntry(name).exists(),

    getFileErrorIcon: (name: string) =>
      findTestSubject(component, `consoleFileSaveErrorIcon-${name}`),
  };

  return publicAPI;
};

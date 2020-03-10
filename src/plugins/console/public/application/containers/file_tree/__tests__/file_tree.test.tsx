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

import '../../../models/legacy_core_editor/legacy_core_editor.test.mocks';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import React from 'react';
import { mount } from 'enzyme';

import { FileTreeEntry } from '../../../components/file_tree/file_tree_entry';

import { serviceContextMock } from '../../../contexts/services_context.mock';
import {
  TextObjectsContextProvider,
  ServicesContextProvider,
  ContextValue,
} from '../../../contexts';

import { FileTree } from '../file_tree';

import { createHelpers } from './helpers';

describe('File Tree', () => {
  let serviceContext: ContextValue;

  beforeEach(() => {
    serviceContext = serviceContextMock.create();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const doMount = () =>
    mount(
      <ServicesContextProvider value={serviceContext}>
        <TextObjectsContextProvider>
          <FileTree />
        </TextObjectsContextProvider>
      </ServicesContextProvider>
    );

  it('renders', () => {
    doMount();
  });

  it('creates a new file', async () => {
    (serviceContext.services.objectStorageClient.text.create as jest.Mock)
      .mockResolvedValueOnce({
        id: 'test',
        name: 'test',
      })
      .mockResolvedValueOnce({
        id: 'test2',
        name: 'test2',
      });

    const component = doMount();

    expect(component.find(FileTreeEntry).length).toBe(0);

    const { createTestFile } = createHelpers(component);
    await createTestFile();

    component.update();
    expect(component.find(FileTreeEntry).length).toBe(1);

    await createTestFile();

    component.update();
    expect(component.find(FileTreeEntry).length).toBe(2);
  });

  it('edits a file name', async () => {
    const oldName = 'test';
    const newName = 'test2';
    (serviceContext.services.objectStorageClient.text.create as jest.Mock).mockResolvedValue({
      id: 'test',
      name: oldName,
    });
    (serviceContext.services.objectStorageClient.text.update as jest.Mock).mockResolvedValue({
      id: 'test',
      name: newName,
    });

    const component = doMount();

    expect(component.find(FileTreeEntry).length).toBe(0);

    const { createTestFile, editFile } = createHelpers(component);
    await createTestFile();
    component.update();

    await editFile(oldName, newName);
    component.update();

    expect(component.find(FileTreeEntry).length).toBe(1);
    expect(findTestSubject(component, `consoleFileNameLabel-${newName}`).text()).toBe(newName);
  });

  it('deletes a file', async () => {});

  it('shows errors', async () => {});
});
